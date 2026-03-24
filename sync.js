/**
 * French Mot - Sync Module (v4.0)
 * 数据同步：云端/服务器/本地缓存
 */

// ===== 数据保存 =====
async function saveData() {
    const statusEl = document.getElementById('sync-status');
    
    try {
        let cloudSaved = false;
        let localServerSaved = false;
        
        // 1. 保存到云端 (Supabase)
        if (window.FrenchSupabase && window.FrenchSupabase.supabaseReady) {
            try {
                const cloudResult = await window.FrenchSupabase.saveToSupabase(gData);
                
                if (cloudResult.status === 'success') {
                    cloudSaved = true;
                    Logger.info('云端保存成功');
                } else if (cloudResult.status === 'queued') {
                    Logger.info('数据已加入同步队列');
                }
            } catch (cloudError) {
                Logger.error('云端保存异常:', cloudError);
            }
        }
        
        // 2. 保存到本地服务器
        if (API) {
            try {
                const response = await fetch(API + "/save_data", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gData)
                });
                
                if (response.ok) {
                    localServerSaved = true;
                    Logger.info('本地服务器保存成功');
                }
            } catch (localError) {
                Logger.error('本地服务器保存失败:', localError);
            }
        }
        
        // 3. 保存到 localStorage
        try {
            localStorage.setItem(CACHE_KEYS.learningData, JSON.stringify(gData));
        } catch (e) {
            Logger.warn('LocalStorage 保存失败:', e);
        }
        
        // 4. 更新状态显示
        if (statusEl) {
            if (cloudSaved && localServerSaved) {
                statusEl.innerText = "同步云端 & 本地 ✓";
                statusEl.style.background = "#2ecc71";
            } else if (cloudSaved) {
                statusEl.innerText = "同步云端 ✓";
                statusEl.style.background = "#3498db";
            } else if (localServerSaved) {
                statusEl.innerText = "保存本地服务器 ✓";
                statusEl.style.background = "#9b59b6";
            } else {
                statusEl.innerText = "仅本地存储";
                statusEl.style.background = "#95a5a6";
            }
            
            // 3 秒后恢复
            setTimeout(() => {
                if (navigator.onLine && window.FrenchSupabase && window.FrenchSupabase.isOnline()) {
                    statusEl.innerText = "在线";
                    statusEl.style.background = "#3498db";
                } else {
                    statusEl.innerText = "离线模式";
                    statusEl.style.background = "#95a5a6";
                }
            }, 3000);
        }
        
    } catch (e) {
        Logger.error('保存错误:', e);
        if (statusEl) {
            statusEl.innerText = "保存错误：" + e.message;
            statusEl.style.background = "#e74c3c";
        }
    }
}

// ===== 会话保存 =====
function saveSession() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const sessionData = {
            sessionMastery: sessionMastery,
            gCombo: gCombo || 0,
            date: today,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(CACHE_KEYS.sessionData, JSON.stringify(sessionData));
        Logger.debug('Session saved:', today, Object.keys(sessionMastery).length, 'words');
    } catch (e) {
        Logger.error('Session save error:', e);
    }
}

// ===== 会话加载 =====
function loadSession() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 清理旧键名
        try { localStorage.removeItem('french_session_mastery'); } catch(e) {}
        
        const saved = localStorage.getItem(CACHE_KEYS.sessionData);
        if (saved) {
            const sessionData = JSON.parse(saved);
            
            // 检查是否是今天的数据
            if (sessionData.date === today) {
                sessionMastery = sessionData.sessionMastery || {};
                gCombo = sessionData.gCombo || 0;
                Logger.info('恢复今日会话数据:', Object.keys(sessionMastery).length, 'words');
            }
        }
    } catch (e) {
        Logger.error('Session load error:', e);
        sessionMastery = {};
    }
}

// ===== 状态更新 =====
function updateSyncStatus(msg, bg) {
    const el = document.getElementById('sync-status');
    if (el) {
        el.innerText = msg;
        el.style.background = bg;
    }
}

// ===== 数据导出 =====
function exportData() {
    const dataStr = JSON.stringify(gData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `french_data_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    Logger.info('数据导出成功');
}

// ===== 强制刷新 =====
function forceRefresh() {
    Logger.info('强制刷新中...');
    
    try {
        Object.values(CACHE_KEYS).forEach(key => {
            try { localStorage.removeItem(key); } catch(e) {}
        });
        Logger.info('本地缓存已清除');
    } catch (e) {
        Logger.warn('清除缓存失败:', e);
    }
    
    window.location.reload();
}

// ===== 导出 =====
window.Sync = {
    saveData,
    saveSession,
    loadSession,
    updateSyncStatus,
    exportData,
    forceRefresh
};
