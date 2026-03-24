/**
 * French Mot - Application Core (v4.0)
 * 主应用逻辑：初始化、状态管理、生命周期
 */

// ===== 配置加载 =====
const CONFIG = window.TongtongConfig || {};
const CACHE_KEYS = CONFIG.cacheKeys || {
    learningData: 'french_learning_data',
    appVersion: 'french_app_version',
    sessionData: 'french_session_data'
};

// ===== 全局状态 =====
let gData = { 
    stars: 100, 
    notebook: [], 
    daily_stats: { date: "", completed: false, words: [] }, 
    last_milestone: 0 
};
let sessionMastery = {};
let gTodayWords = [];
let gGameMode = 'new';
let gCombo = 0;
let gIsLocked = false;
let API = "";

// ===== 常量 =====
const INTERVALS = [1, 2, 4, 7, 15, 30, 60];
const MASTERY_GOAL = 2;
const BASE_DB = [
    { word: "Soleil", definition: "L'astre qui éclaire la Terre le jour.", example: "Le soleil brille.", niveau: 1 },
    { word: "Lune", definition: "Le satellite naturel de la Terre.", example: "La lune est ronde.", niveau: 1 },
    { word: "Chat", definition: "Animal domestique qui miaule.", example: "Le chat miaule.", niveau: 1 },
    { word: "Chien", definition: "Animal domestique fidèle à l'homme.", example: "Le chien aboie.", niveau: 1 },
    { word: "Maison", definition: "Bâtiment où l'on habite.", example: "Ma maison est jaune.", niveau: 1 },
];

let FULL_DB = null;
const FULL_DB_PATH = "./french_full_db.json";

// ===== 日志工具（支持级别控制）=====
const Logger = {
    level: window.location.hostname === 'localhost' ? 'debug' : 'info',
    
    debug(msg, ...args) {
        if (this.level === 'debug') console.log(`[DEBUG] ${msg}`, ...args);
    },
    
    info(msg, ...args) {
        if (['debug', 'info'].includes(this.level)) console.log(`[INFO] ${msg}`, ...args);
    },
    
    warn(msg, ...args) {
        console.warn(`[WARN] ${msg}`, ...args);
    },
    
    error(msg, ...args) {
        console.error(`[ERROR] ${msg}`, ...args);
    }
};

// ===== 初始化 =====
async function init() {
    Logger.info('应用初始化开始');
    
    try {
        // 加载会话数据
        loadSession();
        
        // 设置日期显示
        const dateEl = document.getElementById('ui-date');
        if (dateEl) {
            dateEl.innerText = new Date().toLocaleDateString('fr-FR', { 
                weekday:'long', 
                day:'numeric', 
                month:'long' 
            });
        }
        
        // 版本检查
        const savedVersion = localStorage.getItem(CACHE_KEYS.appVersion);
        const currentVersion = CONFIG.appVersion || '4.0';
        
        if (savedVersion !== currentVersion) {
            Logger.info(`版本升级：${savedVersion} → ${currentVersion}，清除缓存`);
            Object.values(CACHE_KEYS).forEach(key => {
                try { localStorage.removeItem(key); } catch(e) {}
            });
            localStorage.setItem(CACHE_KEYS.appVersion, currentVersion);
        }
        
        // 设置 API 地址
        const isLocal = ['localhost', '127.0.0.1', '192.168.32.70'].includes(window.location.hostname);
        API = isLocal ? `http://${window.location.hostname}:3333` : 'http://192.168.32.70:3333';
        
        // 加载数据库
        await loadFullDatabase();
        
        // 加载用户数据
        await loadUserData();
        
        // 生成或加载今日单词
        await loadOrGenerateDailyWords();
        
        // 初始化 UI
        if (typeof refreshUI === 'function') refreshUI();
        if (typeof updateQuiz === 'function') updateQuiz();
        
        // 设置网络监听
        setupNetworkListener();
        
        Logger.info('应用初始化完成');
        
    } catch (error) {
        Logger.error('初始化失败:', error);
        showErrorBanner('初始化失败：' + error.message);
    }
}

// ===== 数据加载 =====
async function loadFullDatabase() {
    // 优先从 Supabase 加载
    if (window.FrenchSupabase && window.FrenchSupabase.supabaseReady) {
        try {
            const vocabulary = await window.FrenchSupabase.loadVocabularyFromSupabase();
            if (vocabulary && vocabulary.length > 0) {
                FULL_DB = vocabulary;
                Logger.info(`从 Supabase 加载单词库：${FULL_DB.length} 个单词`);
                return true;
            }
        } catch (e) {
            Logger.warn('Supabase 单词库加载失败:', e);
        }
    }
    
    // 回退到本地文件
    try {
        const response = await fetch(FULL_DB_PATH + "?t=" + Date.now());
        if (response.ok) {
            FULL_DB = await response.json();
            Logger.info(`从本地文件加载单词库：${FULL_DB.length} 个单词`);
            return true;
        }
    } catch (e) {
        Logger.warn('本地单词库加载失败:', e);
    }
    
    // 最后使用基础数据库
    FULL_DB = BASE_DB;
    Logger.warn(`使用基础数据库：${BASE_DB.length} 个单词`);
    return false;
}

async function loadUserData() {
    let cloudData = null;
    let serverData = null;
    let localData = null;
    
    // 1. 云端数据
    if (window.FrenchSupabase && window.FrenchSupabase.supabaseReady) {
        try {
            cloudData = await window.FrenchSupabase.loadFromSupabase();
            if (cloudData) Logger.info(`云端数据：${cloudData.stars} 星星`);
        } catch (e) {
            Logger.warn('云端数据加载失败:', e);
        }
    }
    
    // 2. 服务器数据
    try {
        const response = await fetch("./french_data.json?t=" + Date.now());
        if (response.ok) {
            serverData = await response.json();
            Logger.info(`服务器数据：${serverData.stars} 星星`);
        }
    } catch (e) {
        Logger.warn('服务器数据加载失败:', e);
    }
    
    // 3. 本地缓存
    try {
        const saved = localStorage.getItem(CACHE_KEYS.learningData);
        if (saved) localData = JSON.parse(saved);
    } catch (e) {
        Logger.warn('本地缓存读取失败:', e);
    }
    
    // 选择星星最多的数据源
    let maxStars = 0;
    let bestSource = null;
    
    if (cloudData && cloudData.stars > maxStars) {
        maxStars = cloudData.stars;
        bestSource = 'cloud';
    }
    if (serverData && serverData.stars > maxStars) {
        maxStars = serverData.stars;
        bestSource = 'server';
    }
    if (localData && localData.stars > maxStars) {
        maxStars = localData.stars;
        bestSource = 'local';
    }
    
    Logger.info(`数据源对比：云端=${cloudData?.stars||0}, 服务器=${serverData?.stars||0}, 本地=${localData?.stars||0} → 选择：${bestSource}`);
    
    if (bestSource === 'server' && serverData) {
        gData = serverData;
        // 同步到云端
        if (window.FrenchSupabase && window.FrenchSupabase.supabaseReady && cloudData && cloudData.stars < gData.stars) {
            window.FrenchSupabase.saveToSupabase(gData);
        }
    } else if (bestSource === 'cloud' && cloudData) {
        gData = cloudData;
    } else if (localData) {
        gData = localData;
    } else {
        gData = { stars: 100, notebook: [], daily_stats: { date: "", completed: false, words: [] }, last_milestone: 0 };
    }
    
    // 数据验证
    validateData();
}

async function loadOrGenerateDailyWords() {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查是否已有今日单词
    if (gData.daily_stats && gData.daily_stats.date === today && gData.daily_stats.words.length > 0) {
        gTodayWords = gData.daily_stats.words.map(word => {
            const dbWord = findWordInDB(word);
            return dbWord ? { ...dbWord, word } : { word };
        });
        Logger.info(`加载已有今日单词：${gTodayWords.length} 个`);
        return;
    }
    
    // 生成新单词
    await generateDailyWords();
}

async function generateDailyWords() {
    const today = new Date().toISOString().split('T')[0];
    const currentDB = getCurrentDB();
    let newDaily = [];
    
    // 从未学习的单词中选择 5 个
    let unlearnedPool = currentDB.filter(v => {
        const n = gData.notebook.find(e => e.word === v.word);
        return !n || (n.lvl || 0) < 7;
    });
    
    if (unlearnedPool.length < 5) {
        Logger.warn(`未学习单词不足 (${unlearnedPool.length})，使用全库`);
        unlearnedPool = currentDB.slice();
    }
    
    // 随机选择 5 个
    let tPool = unlearnedPool.slice();
    let s = Date.now();
    for (let i = 0; i < 5 && tPool.length > 0; i++) {
        let idx = s % tPool.length;
        let selectedWord = tPool.splice(idx, 1)[0].word;
        newDaily.push(selectedWord);
        s = s * 31 + 7;
    }
    
    gData.daily_stats = { date: today, completed: false, words: newDaily };
    sessionMastery = {};
    
    gTodayWords = newDaily.map(word => {
        const dbWord = findWordInDB(word);
        return dbWord ? { ...dbWord, word } : { word };
    });
    
    Logger.info(`生成今日单词：${newDaily.join(', ')}`);
    
    // 立即保存
    if (typeof saveData === 'function') {
        await saveData();
    }
}

// ===== 工具函数 =====
function getCurrentDB() {
    return FULL_DB || BASE_DB;
}

function findWordInDB(word) {
    const db = getCurrentDB();
    return db.find(d => d.word === word);
}

function validateData() {
    if (!gData.stars) gData.stars = 100;
    if (!gData.notebook) gData.notebook = [];
    if (!gData.daily_stats) gData.daily_stats = { date: "", completed: false, words: [] };
    
    // 确保 completed 是布尔值
    if (typeof gData.daily_stats.completed === 'string') {
        gData.daily_stats.completed = gData.daily_stats.completed === 'true';
    }
    
    Logger.info(`数据验证通过：${gData.stars} 星星，${gData.notebook.length} 单词`);
}

function setupNetworkListener() {
    window.addEventListener('online', () => {
        Logger.info('网络恢复在线');
        if (typeof updateSyncStatus === 'function') {
            updateSyncStatus('在线', '#3498db');
        }
    });
    
    window.addEventListener('offline', () => {
        Logger.warn('网络离线');
        if (typeof updateSyncStatus === 'function') {
            updateSyncStatus('离线模式', '#95a5a6');
        }
    });
}

function showErrorBanner(msg) {
    const banner = document.getElementById('error-banner');
    if (banner) {
        banner.innerHTML = `⚠️ ${msg}`;
        banner.style.display = 'block';
    }
}

// ===== 导出 =====
window.App = {
    init,
    Logger,
    CONFIG,
    gData: () => gData,
    gTodayWords: () => gTodayWords,
    sessionMastery: () => sessionMastery
};

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', init);
