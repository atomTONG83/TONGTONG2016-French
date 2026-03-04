/**
 * 法语学习 Supabase 集成模块
 * 保持与现有本地API兼容，同时支持云端同步
 */

// Supabase配置 - 从现有atom-ip.com项目复用
const SUPABASE_CONFIG = {
  url: 'https://ghbmmnapyupusmyxjkvv.supabase.co',
  key: 'sb_publishable_MkMhoECq7wo5qFi3K9Shcg_7LiPM1oU'
};

// 全局变量
let supabaseClient = null;
let currentProfileId = null;
let syncQueue = [];
let isOnline = navigator.onLine;

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

// 保存数据到Supabase（云端）
async function saveToSupabase(gData) {
  if (!supabaseClient) {
    console.warn('Supabase客户端未初始化，跳过云端保存');
    return { status: 'skipped', reason: 'client_not_initialized' };
  }
  
  if (!isOnline) {
    console.warn('网络离线，数据已加入同步队列');
    addToSyncQueue(gData);
    return { status: 'queued', reason: 'offline' };
  }
  
  try {
    const profileId = await getProfileId();
    if (!profileId) {
      throw new Error('无法获取用户档案ID');
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // 1. 更新用户档案（星星数）
    const { error: profileError } = await supabaseClient
      .from('french_profiles')
      .update({
        stars: gData.stars,
        last_milestone: gData.last_milestone || 1000,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);
    
    if (profileError) throw new Error(`用户档案更新失败: ${profileError.message}`);
    
    // 2. 同步每日学习记录
    if (gData.daily_stats && gData.daily_stats.date) {
      const { error: sessionError } = await supabaseClient
        .from('daily_sessions')
        .upsert({
          profile_id: profileId,
          date: gData.daily_stats.date,
          completed: gData.daily_stats.completed || false,
          words_today: gData.daily_stats.words || [],
          stars_earned: gData.daily_stats.stars_earned || 0
        }, { onConflict: 'profile_id,date' });
      
      if (sessionError) console.warn('每日记录同步警告:', sessionError);
    }
    
    console.log('✅ 云端保存成功');
    return { status: 'success', stars: gData.stars };
    
  } catch (error) {
    console.error('❌ 云端保存失败:', error);
    
    // 失败时加入同步队列，稍后重试
    addToSyncQueue(gData);
    
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
    
    // 并行加载用户档案和单词本
    const [profileRes, notebookRes] = await Promise.all([
      supabaseClient
        .from('french_profiles')
        .select('*')
        .eq('id', profileId)
        .single(),
      
      supabaseClient
        .from('french_notebook')
        .select('*')
        .eq('profile_id', profileId)
        .order('added_at', { ascending: false })
    ]);
    
    if (profileRes.error) throw new Error(`用户档案加载失败: ${profileRes.error.message}`);
    if (notebookRes.error) throw new Error(`单词本加载失败: ${notebookRes.error.message}`);
    
    // 转换为原有格式
    const cloudData = {
      stars: profileRes.data.stars,
      last_milestone: profileRes.data.last_milestone || 1000,
      notebook: notebookRes.data.map(item => ({
        word: item.word,
        lvl: item.level,
        next: item.next_review,
        err_days: item.error_days
      }))
    };
    
    console.log(`✅ 云端加载成功: ${cloudData.stars}星星, ${cloudData.notebook.length}单词`);
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

// 同步队列管理
function addToSyncQueue(gData) {
  const queueItem = {
    data: JSON.parse(JSON.stringify(gData)), // 深拷贝
    timestamp: Date.now(),
    attempts: 0
  };
  
  syncQueue.push(queueItem);
  saveSyncQueue();
  
  // 如果队列不为空，启动同步尝试
  if (syncQueue.length === 1) {
    setTimeout(trySyncQueue, 5000); // 5秒后尝试同步
  }
  
  console.log(`📦 数据加入同步队列 (总数: ${syncQueue.length})`);
}

function saveSyncQueue() {
  try {
    localStorage.setItem('french_sync_queue', JSON.stringify(syncQueue));
  } catch (error) {
    console.warn('同步队列保存失败:', error);
  }
}

function loadSyncQueue() {
  try {
    const saved = localStorage.getItem('french_sync_queue');
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
  
  console.log(`🔄 尝试同步队列 (${syncQueue.length}个待同步项)`);
  
  const failedItems = [];
  
  for (const item of syncQueue) {
    item.attempts = (item.attempts || 0) + 1;
    
    try {
      const result = await saveToSupabase(item.data);
      
      if (result.status === 'success') {
        console.log(`✅ 队列项同步成功 (尝试 ${item.attempts}次)`);
        // 成功项不移入failedItems，即从队列中移除
      } else {
        console.warn(`⚠️ 队列项同步失败，保留重试 (尝试 ${item.attempts}次)`);
        failedItems.push(item);
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
  
  syncQueue = failedItems;
  saveSyncQueue();
  
  if (syncQueue.length > 0) {
    // 如果还有失败的项，30秒后再次尝试
    setTimeout(trySyncQueue, 30000);
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
    loadVocabularyFromSupabase,
    getProfileId,
    syncQueue: () => [...syncQueue],
    isOnline: () => isOnline
  };
}

// 导出到全局
window.FrenchSupabase = initFrenchSupabase();