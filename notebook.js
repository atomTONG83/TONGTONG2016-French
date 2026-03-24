/**
 * French Mot - Notebook Module (v4.0)
 * 生词本管理：添加单词、删除单词、更新进度
 */

// ===== 添加单词到生词本 =====
function addWord(word) {
    // 检查是否已在生词本中
    const existing = gData.notebook.find(n => n.word === word);
    
    if (existing) {
        Logger.info(`单词 ${word} 已在生词本中`);
        return;
    }
    
    // 查找单词详情
    const wordData = findWordInDB(word);
    
    // 添加到生词本
    gData.notebook.push({
        word: word,
        lvl: 0,           // 初始等级
        next: null,       // 下次复习日期（完成今日学习后设置）
        err_days: 0       // 错误天数
    });
    
    // 重置 sessionMastery，确保可以练习
    sessionMastery[word] = 0;
    
    Logger.info(`${word} 加入生词本`);
    
    // 显示提示
    setTimeout(() => {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--p); color:white; padding:10px 20px; border-radius:20px; z-index:1000; font-size:0.9em; box-shadow:0 3px 10px rgba(0,0,0,0.2);';
        toast.innerHTML = `📝 Mot ajouté ! Il apparaîtra dans les <strong>révisions</strong> demain.`;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
    }, 100);
    
    speak("Ajoute");
    
    if (typeof refreshUI === 'function') refreshUI();
    
    // 立即保存
    setTimeout(() => {
        if (typeof saveData === 'function') saveData();
    }, 100);
}

// ===== 从生词本删除单词 =====
function removeWord(word) {
    const index = gData.notebook.findIndex(n => n.word === word);
    
    if (index === -1) {
        Logger.warn(`单词 ${word} 不在生词本中`);
        return false;
    }
    
    gData.notebook.splice(index, 1);
    
    // 清除 sessionMastery
    delete sessionMastery[word];
    
    Logger.info(`${word} 从生词本删除`);
    
    if (typeof renderNotebook === 'function') renderNotebook();
    if (typeof saveData === 'function') saveData();
    
    return true;
}

// ===== 更新单词等级 =====
function updateWordLevel(word, newLevel) {
    const item = gData.notebook.find(n => n.word === word);
    
    if (!item) {
        Logger.warn(`单词 ${word} 不在生词本中`);
        return false;
    }
    
    item.lvl = Math.max(0, Math.min(7, newLevel));
    
    // 计算下次复习日期
    if (item.lvl > 0 && item.lvl < INTERVALS.length) {
        const d = new Date();
        d.setDate(d.getDate() + INTERVALS[item.lvl]);
        item.next = d.toISOString().split('T')[0];
    }
    
    Logger.debug(`${word} 等级更新为 ${item.lvl}, 下次复习：${item.next}`);
    
    if (typeof renderNotebook === 'function') renderNotebook();
    if (typeof saveData === 'function') saveData();
    
    return true;
}

// ===== 批量更新复习日期 =====
function updateReviewDates() {
    const today = new Date().toISOString().split('T')[0];
    let updated = 0;
    
    gData.notebook.forEach(item => {
        // 如果下次复习日期是今天或之前，且还未掌握
        if (item.next && item.next <= today && item.lvl < 7) {
            // 已过期，需要复习
            updated++;
        }
    });
    
    Logger.debug(`检查复习日期：${updated} 个单词待复习`);
    return updated;
}

// ===== 生词本统计 =====
function getNotebookStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
        total: gData.notebook.length,
        byLevel: [0, 0, 0, 0, 0, 0, 0, 0],  // Lvl 0-7
        dueToday: 0,
        overdue: 0,
        mastered: 0
    };
    
    gData.notebook.forEach(item => {
        const lvl = item.lvl || 0;
        stats.byLevel[lvl]++;
        
        if (lvl >= 7) {
            stats.mastered++;
        } else if (item.next && item.next < today) {
            stats.overdue++;
        } else if (item.next === today) {
            stats.dueToday++;
        }
    });
    
    return stats;
}

// ===== 生词本搜索 =====
function searchNotebook(query) {
    if (!query || query.length < 2) {
        return gData.notebook;
    }
    
    const lowerQuery = query.toLowerCase();
    
    return gData.notebook.filter(item => {
        const wordData = findWordInDB(item.word);
        const definition = wordData?.definition || '';
        
        return item.word.toLowerCase().includes(lowerQuery) ||
               definition.toLowerCase().includes(lowerQuery);
    });
}

// ===== 导出 =====
window.Notebook = {
    addWord,
    removeWord,
    updateWordLevel,
    updateReviewDates,
    getNotebookStats,
    searchNotebook
};
