/**
 * 法语学习 Supabase 集成模块
 * 提供云端同步与离线重试队列。
 */

const TONGTONG_CONFIG = window.TongtongConfig || {};
const SUPABASE_CONFIG = Object.assign({
  url: '',
  key: ''
}, TONGTONG_CONFIG.supabase || {});
const CACHE_KEYS = Object.assign({
  syncQueue: 'french_sync_queue'
}, TONGTONG_CONFIG.cacheKeys || {});
const NOTEBOOK_BATCH_SIZE = 30;

function dateIsoLocal(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIso() {
  return dateIsoLocal(new Date());
}

// 全局变量
let supabaseClient = null;
let currentProfileId = null;
let syncQueue = [];
let isOnline = navigator.onLine;
let isSyncingQueue = false;

// 初始化Supabase客户端
function initSupabase() {
  try {
    if (window.supabase && SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
      console.log('✅ Supabase客户端初始化成功');
      return true;
    } else {
      console.warn('❌ Supabase配置不完整或库未加载');
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase初始化失败:', error);
    return false;
  }
}

// 获取用户档案ID（缓存以避免重复查询）
async function getProfileId() {
  if (currentProfileId) return currentProfileId;
  
  try {
    const { data, error } = await supabaseClient
      .from('french_profiles')
      .select('id')
      .eq('user_name', 'tongtong')
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('未找到tongtong用户档案');
    
    currentProfileId = data.id;
    return currentProfileId;
  } catch (error) {
    console.error('❌ 获取用户档案失败:', error);
    return null;
  }
}

async function shouldDropStaleSave(profileId, gData) {
  const incomingDaily = gData.daily_stats || {};
  const incomingDate = incomingDaily.date || '';
  const incomingCompleted = incomingDaily.completed === true;

  if (!incomingDate || incomingCompleted) {
    return { drop: false };
  }

  const [remoteProfileRes, remoteSessionRes] = await Promise.all([
    supabaseClient
      .from('french_profiles')
      .select('stars')
      .eq('id', profileId)
      .single(),
    supabaseClient
      .from('daily_sessions')
      .select('completed, stars_earned')
      .eq('profile_id', profileId)
      .eq('date', incomingDate)
      .maybeSingle()
  ]);

  if (!remoteProfileRes.error && Number(remoteProfileRes.data?.stars || 0) > Number(gData.stars || 0)) {
    return { drop: true, reason: 'remote_has_more_stars' };
  }

  if (!remoteSessionRes.error && remoteSessionRes.data?.completed === true) {
    return { drop: true, reason: 'remote_session_already_completed' };
  }

  return { drop: false };
}

async function syncNotebookToSupabase(profileId, notebook) {
  const notebookList = Array.isArray(notebook) ? notebook : [];
  console.log(`📝 同步单词本: ${notebookList.length} 个单词 (upsert only)`);

  const { data: existingRows, error: existingError } = await supabaseClient
    .from('french_notebook')
    .select('word, added_at')
    .eq('profile_id', profileId);

  if (existingError) {
    throw new Error(`单词本现状加载失败: ${existingError.message}`);
  }

  const existingAddedAt = new Map();
  (existingRows || []).forEach(row => {
    existingAddedAt.set(row.word, row.added_at || null);
  });

  const currentWords = new Set();
  const nowIso = new Date().toISOString();
  const notebookItems = [];

  notebookList.forEach(item => {
    if (!item || !item.word || currentWords.has(item.word)) {
      return;
    }

    currentWords.add(item.word);

    const level = item.lvl || 0;
    notebookItems.push({
      profile_id: profileId,
      word: item.word,
      level: level,
      next_review: item.next || null,
      error_days: item.err_days || 0,
      mastered: level >= 7,
      added_at: existingAddedAt.get(item.word) || nowIso
    });
  });

  for (let i = 0; i < notebookItems.length; i += NOTEBOOK_BATCH_SIZE) {
    const batch = notebookItems.slice(i, i + NOTEBOOK_BATCH_SIZE);
    const { error: upsertError } = await supabaseClient
      .from('french_notebook')
      .upsert(batch, { onConflict: 'profile_id,word' });

    if (upsertError) {
      throw new Error(`单词本批次 ${Math.floor(i / NOTEBOOK_BATCH_SIZE) + 1} upsert 失败: ${upsertError.message}`);
    }

    console.log(`  ✅ 批次 ${Math.floor(i / NOTEBOOK_BATCH_SIZE) + 1}: ${batch.length} 个单词`);
  }

  const preservedCount = (existingRows || []).filter(row => !currentWords.has(row.word)).length;
  if (preservedCount > 0) {
    console.log(`🛡️ 已保留 ${preservedCount} 个云端已有、当前快照未包含的单词`);
  }
}

// 保存数据到Supabase（云端）
async function saveToSupabase(gData, options = {}) {
  if (!supabaseClient) {
    console.warn('Supabase客户端未初始化，跳过云端保存');
    return { status: 'skipped', reason: 'client_not_initialized' };
  }

  if (!isOnline) {
    console.warn('网络离线，数据已加入同步队列');
    if (!options.fromQueue) addToSyncQueue(gData);
    return { status: 'queued', reason: 'offline' };
  }

  try {
    const profileId = await getProfileId();
    if (!profileId) {
      throw new Error('无法获取用户档案ID');
    }

    // 先更新 profile 和 notebook（向前推进，不会丢失数据）
    const { error: profileError } = await supabaseClient
      .from('french_profiles')
      .update({
        stars: gData.stars,
        last_milestone: gData.last_milestone || 1000,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (profileError) {
      throw new Error(`用户档案更新失败: ${profileError.message}`);
    }

    await syncNotebookToSupabase(profileId, gData.notebook);

    // 修复：stale check 移到 profile 更新之后
    // 这样如果远程已有更高的 stars（说明其他设备已完成），
    // 就能正确拦截旧缓存的 completed:false 覆盖
    const staleCheck = await shouldDropStaleSave(profileId, gData);
    if (staleCheck.drop) {
      console.warn('🛡️ 已丢弃旧缓存保存，避免覆盖今日完成状态:', staleCheck.reason);
      return { status: 'stale_dropped', reason: staleCheck.reason };
    }

    if (gData.daily_stats && gData.daily_stats.date) {
      const rawStarsEarned = gData.daily_stats.stars_earned ?? gData.daily_stats.rewarded_stars;
      const starsEarned = rawStarsEarned != null
        ? (Number(rawStarsEarned) || 0)
        : (gData.daily_stats.completed ? 100 : 0);
      const { error: sessionError } = await supabaseClient
        .from('daily_sessions')
        .upsert({
          profile_id: profileId,
          date: gData.daily_stats.date,
          completed: gData.daily_stats.completed || false,
          words_today: gData.daily_stats.words || [],
          stars_earned: starsEarned
        }, { onConflict: 'profile_id,date' });

      if (sessionError) {
        console.warn('每日记录同步警告:', sessionError);
      }
    }

    console.log('✅ 云端保存成功（包括单词本）');
    return { status: 'success', stars: gData.stars };
  } catch (error) {
    console.error('❌ 云端保存失败:', error);
    if (!options.fromQueue) addToSyncQueue(gData);
    return {
      status: 'queued',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// 从Supabase加载数据
async function loadFromSupabase() {
  if (!supabaseClient) {
    console.warn('Supabase客户端未初始化，使用本地数据');
    return null;
  }
  
  try {
    const profileId = await getProfileId();
    if (!profileId) {
      console.warn('无法获取用户档案ID，使用本地数据');
      return null;
    }
    
    const today = todayIso();
    
    // 并行加载用户档案、单词本和当日学习记录
    const [profileRes, notebookRes, sessionRes] = await Promise.all([
      supabaseClient
        .from('french_profiles')
        .select('*')
        .eq('id', profileId)
        .single(),
      
      supabaseClient
        .from('french_notebook')
        .select('*')
        .eq('profile_id', profileId)
        .order('added_at', { ascending: false }),
      
      supabaseClient
        .from('daily_sessions')
        .select('*')
        .eq('profile_id', profileId)
        .eq('date', today)
        .maybeSingle()  // 可能没有当日的记录
    ]);
    
    if (profileRes.error) throw new Error(`用户档案加载失败: ${profileRes.error.message}`);
    if (notebookRes.error) throw new Error(`单词本加载失败: ${notebookRes.error.message}`);
    // sessionRes.error 可以忽略，因为可能没有当日记录
    
    // 转换为原有格式
    const cloudData = {
      stars: profileRes.data.stars,
      last_milestone: profileRes.data.last_milestone || 1000,
      notebook: notebookRes.data.map(item => ({
        word: item.word,
        lvl: item.level,
        next: item.next_review,
        err_days: item.error_days
      })),
      daily_stats: {
        date: today,
        completed: false,
        words: [],
        review_words: [],
        completed_review_words: []  // 🆕 v4.3.0: 持久化已完成复习词，防止页面刷新后重复出现
      }
    };
    
    // 如果有当日学习记录，恢复数据
    if (sessionRes.data) {
      cloudData.daily_stats = {
        date: sessionRes.data.date || today,
        completed: sessionRes.data.completed || false,
        words: sessionRes.data.words_today || [],
        review_words: [],  // 从 notebook 动态计算，不存储在 daily_sessions
        completed_review_words: sessionRes.data.completed_review_words || [],  // 🆕 恢复已完成复习词
        stars_earned: sessionRes.data.stars_earned || 0
      };
      console.log(`📅 恢复当日学习记录: ${cloudData.daily_stats.words.length} 个单词，完成状态: ${cloudData.daily_stats.completed}`);
    } else {
      console.log('📅 无当日学习记录，使用默认值');
    }
    
    console.log(`✅ 云端加载成功: ${cloudData.stars}星星, ${cloudData.notebook.length}单词, 当日记录: ${cloudData.daily_stats.words.length}词`);
    return cloudData;
    
  } catch (error) {
    console.error('❌ 云端加载失败:', error);
    return null;
  }
}

// 从Supabase加载完整单词库
async function loadVocabularyFromSupabase() {
  if (!supabaseClient) {
    console.warn('Supabase客户端未初始化，使用本地单词库');
    return null;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('french_vocabulary')
      .select('*')
      .order('word', { ascending: true });
    
    if (error) throw new Error(`单词库加载失败: ${error.message}`);
    
    // 转换为原有格式
    const vocabulary = data.map(item => ({
      word: item.word,
      definition: item.definition,
      example: item.example,
      niveau: item.difficulty || 1
    }));
    
    console.log(`✅ 单词库加载成功: ${vocabulary.length} 个单词`);
    return vocabulary;
    
  } catch (error) {
    console.error('❌ 单词库加载失败:', error);
    return null;
  }
}

async function loadSessionHistory(days) {
  if (!supabaseClient) {
    console.warn('Supabase客户端未初始化，无法加载趋势数据');
    return [];
  }

  try {
    const profileId = await getProfileId();
    if (!profileId) {
      return [];
    }

    const rangeDays = Number(days || 30);
    const since = new Date();
    since.setDate(since.getDate() - rangeDays + 1);
    const sinceDate = dateIsoLocal(since);

    const { data, error } = await supabaseClient
      .from('daily_sessions')
      .select('date, completed, words_today, stars_earned')
      .eq('profile_id', profileId)
      .gte('date', sinceDate)
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`趋势数据加载失败: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ 趋势数据加载失败:', error);
    return [];
  }
}

// 同步队列管理
function addToSyncQueue(gData) {
  const queueItem = {
    data: JSON.parse(JSON.stringify(gData)), // 深拷贝
    timestamp: Date.now(),
    attempts: 0
  };

  // 保存的是完整学习快照，旧快照重试成功反而可能覆盖新进度。
  // 因此队列只保留最新状态，保证离线恢复后写回的是最近一次学习结果。
  syncQueue = [queueItem];
  saveSyncQueue();
  
  // 如果队列不为空，启动同步尝试
  if (syncQueue.length === 1) {
    setTimeout(trySyncQueue, 5000); // 5秒后尝试同步
  }
  
  console.log(`📦 数据加入同步队列 (总数: ${syncQueue.length})`);
}

function saveSyncQueue() {
  try {
    localStorage.setItem(CACHE_KEYS.syncQueue, JSON.stringify(syncQueue));
  } catch (error) {
    console.warn('同步队列保存失败:', error);
  }
}

function clearSyncQueue(reason = 'manual_clear') {
  syncQueue = [];
  saveSyncQueue();
  console.log('🧹 同步队列已清空:', reason);
}

function loadSyncQueue() {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.syncQueue);
    if (saved) {
      syncQueue = JSON.parse(saved);
      console.log(`📦 加载同步队列: ${syncQueue.length}个待同步项`);
    }
  } catch (error) {
    console.warn('同步队列加载失败:', error);
    syncQueue = [];
  }
}

async function trySyncQueue() {
  if (!isOnline || !supabaseClient || syncQueue.length === 0) {
    return;
  }

  if (isSyncingQueue) {
    return;
  }

  isSyncingQueue = true;
  const currentQueue = syncQueue.splice(0);
  saveSyncQueue();
  console.log(`🔄 尝试同步队列 (${currentQueue.length}个待同步项)`);

  const failedItems = [];

  try {
    for (const item of currentQueue) {
      item.attempts = (item.attempts || 0) + 1;

      try {
        const result = await saveToSupabase(item.data, { fromQueue: true });

        if (result.status === 'success' || result.status === 'stale_dropped') {
          console.log(`✅ 队列项同步成功 (尝试 ${item.attempts}次)`);
          // 成功项不移入failedItems，即从队列中移除
        } else if (item.attempts < 5) {
          console.warn(`⚠️ 队列项同步失败，保留重试 (尝试 ${item.attempts}次)`);
          failedItems.push(item);
        } else {
          console.warn(`🗑️ 队列项达到最大重试次数，放弃:`, item);
        }
      } catch (error) {
        console.error(`❌ 队列项同步异常:`, error);
        if (item.attempts < 5) { // 最多尝试5次
          failedItems.push(item);
        } else {
          console.warn(`🗑️ 队列项达到最大重试次数，放弃:`, item);
        }
      }

      // 短暂延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    isSyncingQueue = false;
  }

  if (failedItems.length > 0) {
    // 若同步期间产生了更新快照，优先保留更新快照；否则保留失败项。
    if (syncQueue.length === 0) {
      syncQueue = failedItems.slice(-1);
    }
    saveSyncQueue();

    if (syncQueue.length > 0) {
      // 如果还有失败的项，30秒后再次尝试
      setTimeout(trySyncQueue, 30000);
    }
  } else {
    saveSyncQueue();
    if (syncQueue.length > 0) {
      setTimeout(trySyncQueue, 2000);
    }
  }
}

// 网络状态监听
function setupNetworkListener() {
  window.addEventListener('online', () => {
    console.log('🌐 网络恢复在线');
    isOnline = true;
    
    // 尝试同步队列
    if (syncQueue.length > 0) {
      setTimeout(trySyncQueue, 2000);
    }
    
    // 更新UI状态
    const statusEl = document.getElementById('sync-status');
    if (statusEl && statusEl.textContent.includes('离线')) {
      statusEl.textContent = '同步中...';
      statusEl.style.background = '#f1c40f';
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 网络离线');
    isOnline = false;
    
    // 更新UI状态
    const statusEl = document.getElementById('sync-status');
    if (statusEl) {
      statusEl.textContent = '离线模式';
      statusEl.style.background = '#95a5a6';
    }
  });
}

// 初始化所有功能
function initFrenchSupabase() {
  console.log('🚀 初始化法语Supabase集成');
  
  // 初始化客户端
  const supabaseReady = initSupabase();
  
  // 加载同步队列
  loadSyncQueue();
  
  // 设置网络监听
  setupNetworkListener();
  
  // 设置定时同步队列（每5分钟）
  setInterval(() => {
    if (isOnline && syncQueue.length > 0) {
      trySyncQueue();
    }
  }, 300000); // 5分钟
  
  return {
    supabaseReady,
    saveToSupabase,
    loadFromSupabase,
    loadSessionHistory,
    loadVocabularyFromSupabase,
    clearSyncQueue,
    getProfileId,
    syncQueue: () => [...syncQueue],
    isOnline: () => isOnline
  };
}

// 导出到全局
window.FrenchSupabase = initFrenchSupabase();
