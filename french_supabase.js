/* Cloud is authoritative. One transaction saves each versioned snapshot. */
(function () {
  'use strict';
  const config = window.TongtongConfig || {};
  const queueKey = config.cacheKeys?.syncQueue || 'french_sync_queue';
  const client = window.supabase && config.supabase
    ? window.supabase.createClient(config.supabase.url, config.supabase.key, {
      global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(12000) }) }
    }) : null;
  let profileId = null;
  let queue = [];
  let draining = false;
  let serial = Promise.resolve();
  const ownVersions = new Map();
  function currentOwnVersion(version) {
    while (ownVersions.has(version)) version = ownVersions.get(version);
    return version;
  }
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  const clone = value => JSON.parse(JSON.stringify(value));
  function persist() {
    try { localStorage.setItem(queueKey, JSON.stringify(queue)); }
    catch (error) { notify('storage_full'); }
  }
  function notify(status, detail = {}) {
    window.dispatchEvent(new CustomEvent('french-sync', { detail: { status, ...detail } }));
  }
  async function getProfileId() {
    if (profileId) return profileId;
    if (!client) throw new Error('Cloud client unavailable');
    const { data, error } = await client.from('french_profiles').select('id').eq('user_name', 'tongtong').single();
    if (error) throw error;
    profileId = data.id;
    return profileId;
  }
  async function rows(table, configure = q => q) {
    const result = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await configure(client.from(table).select('*')).range(offset, offset + 499);
      if (error) throw error;
      result.push(...data);
      if (data.length < 500) return result;
    }
  }
  async function loadFromSupabase() {
    try {
      const id = await getProfileId();
      const [profile, notebook, session] = await Promise.all([
        client.from('french_profiles').select('*').eq('id', id).single(),
        rows('french_notebook', q => q.eq('profile_id', id).order('word')),
        client.from('daily_sessions').select('*').eq('profile_id', id).eq('date', today()).maybeSingle()
      ]);
      if (profile.error) throw profile.error;
      if (session.error) throw session.error;
      const s = session.data;
      return {
        stars: profile.data.stars, last_milestone: profile.data.last_milestone,
        cloud_updated_at: profile.data.updated_at,
        notebook: notebook.map(n => ({ word: n.word, lvl: n.level, next: n.next_review, err_days: n.error_days })),
        daily_stats: s ? { ...(s.learning_state || {}), date: s.date, words: s.words_today || [],
          completed: s.completed, stars_earned: s.stars_earned } : { date: '', words: [], completed: false }
      };
    } catch (error) {
      console.warn('Learning cloud unavailable:', error.message);
      return null;
    }
  }
  function enqueue(snapshot, requestId) {
    const day = snapshot.daily_stats?.date;
    queue = queue.filter(item => item.data?.daily_stats?.date !== day);
    queue.push({ data: clone(snapshot), requestId, timestamp: Date.now(), attempts: 0 });
    persist();
  }
  async function write(snapshot, requestId) {
    const id = await getProfileId();
    if (!snapshot.cloud_updated_at) return { status: 'conflict', reason: 'unverified_snapshot' };
    const { data, error } = await client.rpc('save_french_learning', {
      p_profile_id: id, p_expected_updated_at: snapshot.cloud_updated_at,
      p_request_id: requestId, p_data: snapshot
    });
    if (error && error.code === 'PGRST202') return writeCompatible(id, snapshot);
    if (error) throw error;
    return data;
  }
  async function writeCompatible(id, snapshot) {
    const daily = snapshot.daily_stats;
    const [profile, session] = await Promise.all([
      client.from('french_profiles').select('*').eq('id',id).single(),
      client.from('daily_sessions').select('*').eq('profile_id',id).eq('date',daily.date).maybeSingle()
    ]);
    if (profile.error) throw profile.error;
    if (session.error) throw session.error;
    if (profile.data.updated_at !== snapshot.cloud_updated_at || (session.data?.completed && !daily.completed)) {
      return {status:'conflict',reason:'cloud_changed'};
    }
    // Compare-and-set before any notebook/session write. Never write an unverified cache.
    const reservation = await client.from('french_profiles').update({updated_at:new Date().toISOString()})
      .eq('id',id).eq('updated_at',snapshot.cloud_updated_at).select('updated_at').maybeSingle();
    if (reservation.error) throw reservation.error;
    if (!reservation.data) return {status:'conflict',reason:'cloud_changed'};
    snapshot.cloud_updated_at = reservation.data.updated_at;
    notify('reserved',{updated_at:snapshot.cloud_updated_at});
    for (let offset=0; offset<snapshot.notebook.length; offset+=30) {
      const batch=snapshot.notebook.slice(offset,offset+30).map(n=>({profile_id:id,word:n.word,
        level:n.lvl,next_review:n.next,error_days:n.err_days||0,mastered:n.lvl>=7}));
      const result=await client.from('french_notebook').upsert(batch,{onConflict:'profile_id,word'});
      if(result.error) throw result.error;
    }
    const saved=await client.from('daily_sessions').upsert({profile_id:id,date:daily.date,
      completed:daily.completed,words_today:daily.words,
      stars_earned:Math.max(session.data?.stars_earned||0,
        (daily.rewarded_stars||0) + 20 * (daily.backlog_reward_batches||[]).length)}, {onConflict:'profile_id,date'});
    if(saved.error) throw saved.error;
    const stars=Math.max(profile.data.stars, snapshot.stars);
    const updated=await client.from('french_profiles').update({stars,updated_at:new Date().toISOString()})
      .eq('id',id).eq('updated_at',snapshot.cloud_updated_at).select('updated_at').maybeSingle();
    if(updated.error) throw updated.error;
    if(!updated.data) return {status:'conflict',reason:'cloud_changed'};
    return {status:'success',stars,updated_at:updated.data.updated_at,detailSync:false};
  }
  async function saveToSupabase(data, options = {}) {
    const snapshot = clone(data);
    const requestId = options.requestId || crypto.randomUUID();
    const operation = async () => {
      try {
        if (!navigator.onLine || !client) throw new Error('Offline');
        snapshot.cloud_updated_at = currentOwnVersion(snapshot.cloud_updated_at);
        const priorVersion = snapshot.cloud_updated_at;
        const result = await write(snapshot, requestId);
        if (result.status === 'success' && result.updated_at !== priorVersion) {
          ownVersions.set(priorVersion, result.updated_at);
        }
        if (result.status === 'conflict') {
          enqueue(snapshot, requestId);
          queue[queue.length - 1].conflict = true;
          persist();
        }
        if (result.status === 'success') {
          queue = queue.filter(item => item.requestId !== requestId &&
            !(item.data?.daily_stats?.date === snapshot.daily_stats.date && !item.conflict));
          persist();
        }
        notify(result.status, result);
        return result;
      } catch (error) {
        enqueue(snapshot, requestId);
        notify('queued');
        return { status: 'queued', error: error.message };
      }
    };
    const pending = serial.then(operation, operation);
    serial = pending.catch(() => {});
    return pending;
  }
  async function trySyncQueue() {
    if (draining || !navigator.onLine || !queue.length) return;
    draining = true;
    try {
      const item = queue[0];
      if (item.conflict) { notify('conflict'); return; }
      const result = await saveToSupabase(item.data, { requestId: item.requestId });
      if (result.status === 'success') {
        for (const next of queue) {
          if (next.data.cloud_updated_at === item.data.cloud_updated_at) next.data.cloud_updated_at = result.updated_at;
        }
        persist();
      }
    } finally { draining = false; }
  }
  function clearSyncQueue() {
    // Completion must not discard unsent work from another day or device.
    if (queue.length) notify('queued');
  }
  async function loadSessionHistory(days = 3650) {
    const id = await getProfileId();
    const since = new Date(); since.setDate(since.getDate() - days + 1);
    return rows('daily_sessions', q => q.eq('profile_id', id)
      .gte('date', new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(since)).order('date'));
  }
  async function loadVocabularyFromSupabase() {
    try {
      return (await rows('french_vocabulary', q => q.order('word')))
        .map(v => ({ word: v.word, definition: v.definition, example: v.example, niveau: v.difficulty || 1 }));
    } catch (error) { return null; }
  }
  try { queue = JSON.parse(localStorage.getItem(queueKey) || '[]'); if (!Array.isArray(queue)) queue = []; }
  catch (error) { queue = []; }
  // Preserve conflicting legacy work for review, without retrying it forever.
  const conflicts = queue.filter(item => item.conflict || !item.data?.cloud_updated_at);
  if (conflicts.length) {
    try {
      const archive = JSON.parse(localStorage.getItem('french_sync_conflicts') || '[]');
      localStorage.setItem('french_sync_conflicts', JSON.stringify([...archive,...conflicts]));
      queue = queue.filter(item => !conflicts.includes(item)); persist();
    } catch (error) { notify('storage_full'); }
  }
  window.addEventListener('online', trySyncQueue);
  setInterval(trySyncQueue, 30000);
  window.FrenchSupabase = { supabaseReady: !!client, saveToSupabase, loadFromSupabase,
    loadSessionHistory, loadVocabularyFromSupabase, getProfileId, clearSyncQueue,
    syncQueue: () => clone(queue), isOnline: () => navigator.onLine };
})();
