/**
 * French Mot - UI Module (v4.0)
 * UI 渲染：进度条、统计、列表、弹窗
 */

// ===== 刷新 UI =====
function refreshUI() {
    const starsEl = document.getElementById('ui-stars');
    const trophiesEl = document.getElementById('ui-trophies');
    const countEl = document.getElementById('ui-count');
    const streakEl = document.getElementById('ui-streak');
    
    if (starsEl) starsEl.innerText = gData.stars || 0;
    if (trophiesEl) trophiesEl.innerText = Math.floor((gData.stars || 0) / 1000);
    if (countEl) countEl.innerText = gData.notebook.length;
    if (streakEl) streakEl.innerText = (gData.streak && gData.streak.current) || 0;
    
    // 更新今日单词列表
    const wordsListEl = document.getElementById('ui-words-list');
    if (wordsListEl) {
        if (gTodayWords && Array.isArray(gTodayWords)) {
            wordsListEl.innerHTML = gTodayWords.map(w => {
                if (!w || !w.word) return '';
                const isAdded = gData.notebook.some(n => n.word === w.word);
                return `
                    <div class="daily-item">
                        <div class="mot">${w.word}</div>
                        <div class="definition">${w.definition || w.def || ''}</div>
                        <div class="exemple">"${w.example || w.ex || ''}"</div>
                        <div style="margin-top:10px">
                            <button class="action-btn" onclick="speak('${w.word.replace(/'/g, "\\'")}')">Ecouter</button>
                            <button class="action-btn" style="background:${isAdded ? '#ccc' : 'var(--p)'}" onclick="addWord('${w.word.replace(/'/g, "\\'")}')">
                                ${isAdded ? 'Ajouté' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            wordsListEl.innerHTML = '<p style="padding:20px; color:#999; text-align:center;">Aucun mot à apprendre aujourd\'hui.</p>';
        }
    }
    
    updateProgressBars();
}

// ===== 进度条更新 =====
function updateProgressBars() {
    const todayWords = gTodayWords || [];
    let masteredToday = 0;
    
    todayWords.forEach(tw => {
        if (sessionMastery[tw.word] >= MASTERY_GOAL) {
            masteredToday++;
        }
    });
    
    const newProgress = todayWords.length > 0 ? (masteredToday / todayWords.length) * 100 : 100;
    
    const reviewStatus = getReviewCompletionStatus();
    const reviewProgress = reviewStatus.total > 0 ? (reviewStatus.mastered / reviewStatus.total) * 100 : 100;
    
    const barNewEl = document.getElementById('bar-n');
    const barRevEl = document.getElementById('bar-r');
    const progressTextEl = document.getElementById('ui-progress');
    const completionStatusEl = document.getElementById('ui-completion-status');
    
    // iPad 修复：数据标记为已完成时强制显示
    const today = new Date().toISOString().split('T')[0];
    let shouldShowCompleted = false;
    
    if (gData && gData.daily_stats && gData.daily_stats.date === today && gData.daily_stats.completed === true) {
        shouldShowCompleted = true;
    }
    
    if (shouldShowCompleted) {
        newProgress = 100;
        reviewProgress = 100;
    }
    
    if (barNewEl) barNewEl.style.width = newProgress + '%';
    if (barRevEl) barRevEl.style.width = reviewProgress + '%';
    
    if (progressTextEl) {
        progressTextEl.textContent = Math.round((newProgress + reviewProgress) / 2) + '%';
    }
    
    // 更新完成状态文本
    if (completionStatusEl) {
        if (shouldShowCompleted) {
            completionStatusEl.textContent = "✅ Bravo ! Tous les mots du jour et révisions terminés !";
            completionStatusEl.style.color = "var(--s)";
        } else if (todayWords.length === 0 && reviewStatus.total === 0) {
            completionStatusEl.textContent = "✅ Rien à faire aujourd'hui !";
            completionStatusEl.style.color = "var(--s)";
        } else if (newProgress === 100 && reviewProgress === 100) {
            completionStatusEl.textContent = "✅ Bravo ! Tous les mots du jour et révisions terminés !";
            completionStatusEl.style.color = "var(--s)";
        } else if (newProgress === 100 && reviewProgress < 100) {
            completionStatusEl.textContent = `⚠️ Nouveaux mots terminés. Révisions restantes: ${reviewStatus.total - reviewStatus.mastered}/${reviewStatus.total}`;
            completionStatusEl.style.color = "#f39c12";
        } else if (newProgress < 100 && reviewProgress === 100) {
            completionStatusEl.textContent = `ℹ️ Révisions terminées. Nouveaux mots restants: ${todayWords.length - masteredToday}/${todayWords.length}`;
            completionStatusEl.style.color = "#f39c12";
        } else {
            completionStatusEl.textContent = `📚 En cours: ${masteredToday}/${todayWords.length} nouveaux + ${reviewStatus.mastered}/${reviewStatus.total} révisions`;
            completionStatusEl.style.color = "var(--p)";
        }
    }
}

// ===== 生词本渲染 =====
function renderNotebook() {
    const nbList = document.getElementById('nb-list');
    const nbTotal = document.getElementById('nb-total');
    const nbStats = document.getElementById('nb-stats');
    
    if (!nbList) return;
    
    // 按掌握程度分组
    const groups = {
        beginner: [],      // Lvl 1-2
        consolidating: [], // Lvl 3-4
        advanced: [],      // Lvl 5-6
        mastered: []       // Lvl 7
    };
    
    const today = new Date().toISOString().split('T')[0];
    
    gData.notebook.forEach(item => {
        const lvl = item.lvl || 0;
        const isDue = item.next === today;
        
        const wordData = {
            ...item,
            isDue,
            mastered: lvl >= 7
        };
        
        if (lvl >= 7) groups.mastered.push(wordData);
        else if (lvl >= 5) groups.advanced.push(wordData);
        else if (lvl >= 3) groups.consolidating.push(wordData);
        else groups.beginner.push(wordData);
    });
    
    // 更新统计
    if (nbTotal) nbTotal.textContent = `(Total: ${gData.notebook.length})`;
    
    if (nbStats) {
        nbStats.innerHTML = `
            <div class="nb-stat">
                <div class="nb-stat-value">${groups.beginner.length}</div>
                <div>Débutant</div>
            </div>
            <div class="nb-stat">
                <div class="nb-stat-value">${groups.consolidating.length}</div>
                <div>Consolidation</div>
            </div>
            <div class="nb-stat">
                <div class="nb-stat-value">${groups.advanced.length}</div>
                <div>Avancé</div>
            </div>
            <div class="nb-stat">
                <div class="nb-stat-value">${groups.mastered.length}</div>
                <div>Maîtrisé</div>
            </div>
        `;
    }
    
    // 渲染分组
    nbList.innerHTML = `
        ${renderGroup('Débutants', groups.beginner, 'nb-beginner')}
        ${renderGroup('En consolidation', groups.consolidating, 'nb-consolidating')}
        ${renderGroup('Avancés', groups.advanced, 'nb-advanced')}
        ${renderGroup('Maîtrisés', groups.mastered, 'nb-mastered')}
    `;
}

function renderGroup(title, words, className) {
    if (words.length === 0) return '';
    
    const dueCount = words.filter(w => w.isDue).length;
    const isExpanded = className === 'nb-beginner' || dueCount > 0;
    
    return `
        <div class="nb-group ${className}">
            <div class="nb-group-header" onclick="toggleGroup(this)">
                <span>${title} (${words.length}) ${dueCount > 0 ? `⚠️ ${dueCount} à réviser` : ''}</span>
                <span class="nb-group-count">${Math.round(words.length / gData.notebook.length * 100)}%</span>
            </div>
            <div class="nb-group-content ${isExpanded ? '' : 'collapsed'}">
                ${words.map(w => renderNotebookItem(w)).join('')}
            </div>
        </div>
    `;
}

function renderNotebookItem(item) {
    const wordData = findWordInDB(item.word) || {};
    const definition = wordData.definition || wordData.def || '...';
    
    return `
        <div class="notebook-item ${item.isDue ? 'nb-word-due' : ''}">
            <div style="flex:1">
                <div style="font-weight:bold; color:var(--p)">${item.word}</div>
                <div style="font-size:0.85em; color:#666">${definition}</div>
                <div class="mastery-indicator">
                    ${Array(7).fill(0).map((_, i) => 
                        `<div class="dot ${i < (item.lvl || 0) ? 'full' : ''}"></div>`
                    ).join('')}
                </div>
            </div>
            <div style="text-align:right; font-size:0.8em; color:#999">
                <div>Prochain: ${item.next || '—'}</div>
                ${item.err_days > 0 ? `<div style="color:#e74c3c">Erreurs: ${item.err_days}</div>` : ''}
            </div>
        </div>
    `;
}

function toggleGroup(header) {
    const content = header.nextElementSibling;
    if (content) {
        content.classList.toggle('collapsed');
    }
}

function openNotebook() {
    renderNotebook();
    openModal('nbModal');
}

// ===== 弹窗控制 =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== 语音朗读 =====
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

// ===== 导出 =====
window.UI = {
    refreshUI,
    updateProgressBars,
    renderNotebook,
    openNotebook,
    openModal,
    closeModal,
    speak,
    toggleGroup
};
