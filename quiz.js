/**
 * French Mot - Quiz Module (v4.0)
 * 答题逻辑：题目生成、答案检查、进度追踪
 */

// ===== 答题逻辑 =====
function updateQuiz() {
    const today = new Date().toISOString().split('T')[0];
    let pool = [];
    
    if (gGameMode === 'new') {
        // 新词模式：显示今日新词中未掌握的
        pool = gTodayWords.filter(w => {
            const inNotebook = gData.notebook.some(n => n.word === w.word);
            const mastery = sessionMastery[w.word] || 0;
            return inNotebook && mastery < MASTERY_GOAL;
        });
    } else {
        // 复习模式：显示今天到期的复习单词
        const currentDB = getCurrentDB();
        pool = currentDB.filter(v => {
            const n = gData.notebook.find(e => e.word === v.word);
            return n && n.next === today && 
                   !gTodayWords.some(tw => tw.word === v.word) && 
                   (sessionMastery[v.word] || 0) < MASTERY_GOAL;
        });
    }
    
    const feedbackEl = document.getElementById('q-feedback');
    const optionsEl = document.getElementById('q-options');
    const wordEl = document.getElementById('q-word');
    const masteryEl = document.getElementById('q-mastery');
    
    if (feedbackEl) feedbackEl.innerText = "";
    gIsLocked = false;
    
    if (pool.length < 1) {
        const isNew = gGameMode === 'new';
        const msg = isNew 
            ? "Nouveaux mots maîtrisés !" 
            : "Révisions terminées !";
        
        if (optionsEl) {
            optionsEl.innerHTML = `<p style="padding:20px; color:var(--p); font-weight:bold; text-align:center;">${msg}</p>`;
        }
        if (wordEl) wordEl.innerText = "Salut !";
        if (masteryEl) masteryEl.innerHTML = "";
        return;
    }
    
    // 随机选择一个单词
    const target = pool[Math.floor(Math.random() * pool.length)];
    
    if (wordEl) wordEl.innerText = target.word;
    
    // 显示掌握进度
    const mCount = sessionMastery[target.word] || 0;
    if (masteryEl) {
        let dots = '';
        for (let i = 0; i < MASTERY_GOAL; i++) {
            dots += `<div class="dot ${i < mCount ? 'full' : ''}"></div>`;
        }
        masteryEl.innerHTML = dots;
    }
    
    // 生成选项
    generateOptions(target);
}

function generateOptions(target) {
    const optionsEl = document.getElementById('q-options');
    if (!optionsEl) return;
    
    const currentDB = getCurrentDB();
    if (!currentDB || !Array.isArray(currentDB)) {
        optionsEl.innerHTML = '<p style="padding:20px; color:red; text-align:center;">Erreur: base de données non chargée</p>';
        return;
    }
    
    // 生成 3 个选项（1 个正确 + 2 个干扰）
    let opts = [target.definition || target.def || ''];
    let all = currentDB.map(v => v.definition || v.def || '');
    
    while (opts.length < 3) {
        let r = all[Math.floor(Math.random() * all.length)];
        if (!opts.includes(r)) opts.push(r);
    }
    
    // 随机打乱
    opts.sort(() => Math.random() - 0.5);
    
    optionsEl.innerHTML = opts.map(o => {
        const escapedOpt = o.replace(/'/g, "\\'");
        const escapedWord = target.word.replace(/'/g, "\\'");
        return `<button class="opt-btn" onclick="checkQuiz(this, '${escapedOpt}', '${escapedWord}')">${o}</button>`;
    }).join('');
}

function checkQuiz(btn, sel, w) {
    if (gIsLocked) return;
    gIsLocked = true;
    
    const target = findWordInDB(w);
    const n = gData.notebook.find(e => e.word === w);
    
    const feedbackEl = document.getElementById('q-feedback');
    const allBtns = document.querySelectorAll('.opt-btn');
    allBtns.forEach(b => b.disabled = true);
    
    if (sel === (target.definition || target.def || '')) {
        // 正确
        btn.classList.add('correct');
        if (feedbackEl) {
            feedbackEl.innerHTML = "✅ Très bien !";
            feedbackEl.style.color = "var(--s)";
        }
        
        sessionMastery[w] = (sessionMastery[w] || 0) + 1;
        
        if (sessionMastery[w] >= MASTERY_GOAL && n) {
            // 单词掌握
            n.lvl = Math.min(6, n.lvl + 1);
            n.err_days = 0;
            let d = new Date();
            d.setDate(d.getDate() + INTERVALS[n.lvl]);
            n.next = d.toISOString().split('T')[0];
            
            if (feedbackEl) {
                feedbackEl.innerHTML = `🎉 Mot maîtrisé ! Niveau ${n.lvl} atteint !`;
                feedbackEl.style.color = "#9b59b6";
            }
            speak("Bravo");
        }
        
        gCombo++;
        
        // 检查是否完成每日目标
        checkDailyCompletion();
        
        setTimeout(() => {
            if (typeof refreshUI === 'function') refreshUI();
            if (typeof updateQuiz === 'function') updateQuiz();
            if (typeof saveData === 'function') saveData();
            if (typeof saveSession === 'function') saveSession();
        }, 1000);
        
    } else {
        // 错误
        btn.classList.add('wrong');
        allBtns.forEach(b => {
            if (b.innerText === (target.definition || target.def || '')) {
                b.classList.add('correct');
            }
        });
        
        sessionMastery[w] = 0; // 重置掌握进度
        
        if (feedbackEl) {
            feedbackEl.innerHTML = "⚠️ Première erreur";
            feedbackEl.style.color = "#f39c12";
        }
        
        speak("Attention");
        
        setTimeout(() => {
            if (typeof refreshUI === 'function') refreshUI();
            if (typeof updateQuiz === 'function') updateQuiz();
            if (typeof saveData === 'function') saveData();
            if (typeof saveSession === 'function') saveSession();
        }, 1800);
    }
}

function setQuizMode(m) {
    gGameMode = m;
    const modeN = document.getElementById('mode-n');
    const modeR = document.getElementById('mode-r');
    
    if (modeN) modeN.classList.toggle('active', m === 'new');
    if (modeR) modeR.classList.toggle('active', m === 'rev');
    
    updateQuiz();
}

// ===== 每日完成检查 =====
function checkDailyCompletion() {
    const todayWords = gTodayWords || [];
    let masteredToday = 0;
    
    todayWords.forEach(tw => {
        if (sessionMastery[tw.word] >= MASTERY_GOAL) {
            masteredToday++;
        }
    });
    
    const reviewStatus = getReviewCompletionStatus();
    const today = new Date().toISOString().split('T')[0];
    const isToday = gData.daily_stats && gData.daily_stats.date === today;
    
    Logger.debug('checkDailyCompletion', {
        todayWords: todayWords.map(w => w.word),
        masteredToday,
        reviewTotal: reviewStatus.total,
        reviewCompleted: reviewStatus.completed,
        isToday,
        alreadyCompleted: gData.daily_stats.completed
    });
    
    // 完成条件：所有新词 + 所有复习词完成
    if (masteredToday >= todayWords.length && 
        reviewStatus.completed && 
        isToday && 
        !gData.daily_stats.completed) {
        
        Logger.info('✅ 条件满足，发放 100 星星奖励');
        
        gData.daily_stats.completed = true;
        if (!gData.stars) gData.stars = 0;
        gData.stars += 100;
        
        gData.daily_stats.rewarded_at = new Date().toISOString();
        gData.daily_stats.rewarded_stars = 100;
        
        if (typeof updateStreak === 'function') updateStreak();
        
        setTimeout(() => {
            const streakMsg = (gData.streak && gData.streak.current > 1) 
                ? `\n🔥 Série de ${gData.streak.current} jours !` 
                : "";
            
            const rewVal = document.getElementById('rew-val');
            if (rewVal) {
                rewVal.innerText = `🎉 Magnifique !\nTu as maîtrisé tous les mots du jour et terminé toutes les révisions !\n+100 étoiles !${streakMsg}`;
            }
            
            if (typeof openModal === 'function') openModal('rewardModal');
            if (typeof speak === 'function') speak("Félicitations");
            if (typeof saveData === 'function') saveData();
        }, 500);
    }
}

function getReviewCompletionStatus() {
    const today = new Date().toISOString().split('T')[0];
    let reviewWords = [];
    
    if (gData.notebook) {
        // 只检查今天到期的复习单词（排除今日新词）
        reviewWords = gData.notebook.filter(n => {
            return n.next === today && !gData.daily_stats.words.includes(n.word);
        });
    }
    
    let masteredReview = 0;
    reviewWords.forEach(n => {
        if ((sessionMastery[n.word] || 0) >= MASTERY_GOAL) {
            masteredReview++;
        }
    });
    
    return {
        total: reviewWords.length,
        mastered: masteredReview,
        completed: reviewWords.length === 0 || masteredReview >= reviewWords.length,
        words: reviewWords.map(n => n.word)
    };
}

// ===== 导出 =====
window.Quiz = {
    updateQuiz,
    checkQuiz,
    setQuizMode,
    checkDailyCompletion,
    getReviewCompletionStatus
};
