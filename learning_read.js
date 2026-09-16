(function () {
  'use strict';
  const cfg = window.TongtongConfig.supabase;
  async function read(table, params = {}) {
    const all = [];
    for (let offset = 0; ; offset += 500) {
      const query = new URLSearchParams({ select: '*', ...params, limit: '500', offset: String(offset) });
      const response = await fetch(`${cfg.url}/rest/v1/${table}?${query}`, {
        headers: { apikey: cfg.key }, signal: AbortSignal.timeout(12000), cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Lecture indisponible (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Données non valides');
      all.push(...data);
      if (data.length < 500) return all;
    }
  }
  const day = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
  async function load(attempt = 0) {
    const profiles = await read('french_profiles', { user_name: 'eq.tongtong' });
    if (profiles.length !== 1) throw new Error('Profil indisponible');
    const profile = profiles[0];
    const [notebook, sessions] = await Promise.all([
      read('french_notebook', { profile_id: `eq.${profile.id}`, order: 'word' }),
      read('daily_sessions', { profile_id: `eq.${profile.id}`, order: 'date.desc' })
    ]);
    const latest = await read('french_profiles', { id: `eq.${profile.id}`, select:'updated_at' });
    if (latest[0]?.updated_at !== profile.updated_at) {
      if (attempt < 2) return load(attempt + 1);
      throw new Error('La progression est en cours de sauvegarde. Réessayez.');
    }
    return { profile, notebook, sessions, fetchedAt: new Date().toISOString() };
  }
  window.LearningRead = { load, day };
})();
