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

// ===== 日志工具 =====
const Logger = {
    level: window.location.hostname === 'localhost' ? 'debug' : 'info',
    debug(msg, ...args) { if (this.level === 'debug') console.log(`[DEBUG] ${msg}`, ...args); },
    info(msg, ...args) { if (['debug', 'info'].includes(this.level)) console.log(`[INFO] ${msg}`, ...args); },
    warn(msg, ...args) { console.warn(`[WARN] ${msg}`, ...args); },
    error(msg, ...args) { console.error(`[ERROR] ${msg}`, ...args); }
};

// ===== 初始化 =====
async function init() {
    Logger.info('应用初始化开始');
    try {
        loadSession();
        const dateEl = document.getElementById('ui-date');
        if (dateEl) dateEl.innerText = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
        
        const savedVersion = localStorage.getItem(CACHE_KEYS.appVersion);
        const currentVersion = CONFIG.appVersion || '4.0';
        if (savedVersion !== currentVersion) {
            Logger.info(`版本升级：${savedVersion} → ${currentVersion}`);
            Object.values(CACHE_KEYS).forEach(key => { try { localStorage.removeItem(key); } catch(e) {} });
            localStorage.setItem(CACHE_KEYS.appVersion, currentVersion);
        }
        
        const isLocal = ['localhost', '127.0.0.1', '192.168.32.70'].includes(window.location.hostname);
        API = isLocal ? `http://${window.location.hostname}:3333` : 'http://192.168.32.70:3333';
        
        await loadFullDatabase();
        await loadUserData();
        await loadOrGenerateDailyWords();
        
        if (typeof refreshUI === 'function') refreshUI();
        if (typeof updateQuiz === 'function') updateQuiz();
        setupNetworkListener();
        
        Logger.info('应用初始化完成');
    } catch (error) {
        Logger.error('初始化失败:', error);
    }
}

async function loadFullDatabase() {
    if (window.FrenchSupabase && window.FrenchSupabase.supabaseReady) {
        try {
            const vocabulary = await window.FrenchSupabase.loadVocabularyFromSupabase();
            if (vocabulary && vocabulary.length > 0) { FULL_DB = vocabulary; Logger.info(`Supabase: ${FULL_DB.length} 词`); return true; }
        } catch (e) { Logger.warn('Supabase 失败:', e); }
    }
    try {
        const response = await fetch(FULL_DB_PATH + "?t=" + Date.now());
        if (response.ok) { FULL_DB = await response.json(); Logger.info(`本地：${FULL_DB.length} 词`); return true; }
    } catch (e) { Logger.warn('本地失败:', e); }
    FULL_DB = BASE_DB;
    Logger.warn(`基础：${BASE_DB.length} 词`);
    return false;
}

async function loadUserData() {
    let cloudData = null, serverData = null, localData = null;
    if (window.FrenchSupabase && window.FrenchSupabase.supabaseReady) {
        try { cloudData = await window.FrenchSupabase.loadFromSupabase(); } catch (e) {}
    }
    try { const r = await fetch("./french_data.json?t="+Date.now()); if (r.ok) serverData = await r.json(); } catch (e) {}
    try { const s = localStorage.getItem(CACHE_KEYS.learningData); if (s) localData = JSON.parse(s); } catch (e) {}
    
    let maxStars = 0, bestSource = null;
    if (cloudData && cloudData.stars > maxStars) { maxStars = cloudData.stars; bestSource = 'cloud'; }
    if (serverData && serverData.stars > maxStars) { maxStars = serverData.stars; bestSource = 'server'; }
    if (localData && localData.stars > maxStars) { maxStars = localData.stars; bestSource = 'local'; }
    
    if (bestSource === 'server' && serverData) gData = serverData;
    else if (bestSource === 'cloud' && cloudData) gData = cloudData;
    else if (localData) gData = localData;
    else gData = { stars: 100, notebook: [], daily_stats: { date: "", completed: false, words: [] }, last_milestone: 0 };
    
    validateData();
}

async function loadOrGenerateDailyWords() {
    const today = new Date().toISOString().split('T')[0];
    if (gData.daily_stats && gData.daily_stats.date === today && gData.daily_stats.words.length > 0) {
        gTodayWords = gData.daily_stats.words.map(word => { const w = findWordInDB(word); return w ? { ...w, word } : { word }; });
        Logger.info(`加载今日单词：${gTodayWords.length}`); return;
    }
    await generateDailyWords();
}

async function generateDailyWords() {
    const today = new Date().toISOString().split('T')[0];
    const currentDB = getCurrentDB();
    let unlearnedPool = currentDB.filter(v => { const n = gData.notebook.find(e => e.word === v.word); return !n || (n.lvl || 0) < 7; });
    if (unlearnedPool.length < 5) unlearnedPool = currentDB.slice();
    
    let newDaily = [], tPool = unlearnedPool.slice(), s = Date.now();
    for (let i = 0; i < 5 && tPool.length > 0; i++) { let idx = s % tPool.length; newDaily.push(tPool.splice(idx, 1)[0].word); s = s * 31 + 7; }
    
    gData.daily_stats = { date: today, completed: false, words: newDaily };
    sessionMastery = {};
    gTodayWords = newDaily.map(word => { const w = findWordInDB(word); return w ? { ...w, word } : { word }; });
    Logger.info(`生成今日单词：${newDaily.join(', ')}`);
    if (typeof saveData === 'function') await saveData();
}

function getCurrentDB() { return FULL_DB || BASE_DB; }
function findWordInDB(word) { const db = getCurrentDB(); return db.find(d => d.word === word); }
function validateData() {
    if (!gData.stars) gData.stars = 100;
    if (!gData.notebook) gData.notebook = [];
    if (!gData.daily_stats) gData.daily_stats = { date: "", completed: false, words: [] };
    if (typeof gData.daily_stats.completed === 'string') gData.daily_stats.completed = gData.daily_stats.completed === 'true';
}
function setupNetworkListener() {
    window.addEventListener('online', () => Logger.info('在线'));
    window.addEventListener('offline', () => Logger.warn('离线'));
}

window.App = { init, Logger, CONFIG, gData: () => gData, gTodayWords: () => gTodayWords, sessionMastery: () => sessionMastery };
document.addEventListener('DOMContentLoaded', init);
