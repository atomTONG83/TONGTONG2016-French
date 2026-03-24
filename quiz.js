(function () {
  const app = window.FrenchMotApp;

  function setQuizMode(mode) {
    app.state.quizMode = mode;
    const modeNew = document.getElementById('mode-n');
    const modeReview = document.getElementById('mode-r');
    if (modeNew) {
      modeNew.classList.toggle('active', mode === 'new');
    }
    if (modeReview) {
      modeReview.classList.toggle('active', mode === 'rev');
    }
    updateQuiz();
  }

  function getReviewPool(today) {
    const currentDb = app.getCurrentDb();
    const backlog = app.state.data.daily_stats.backlog_review || [];
    if (backlog.length > 0) {
      return currentDb.filter(function (entry) {
        return backlog.indexOf(entry.word) >= 0 &&
          (app.state.sessionMastery[entry.word] || 0) < app.constants.masteryGoal;
      });
    }
    return currentDb.filter(function (entry) {
      const notebookItem = app.state.data.notebook.find(function (item) {
        return item.word === entry.word;
      });
      return !!notebookItem &&
        notebookItem.next === today &&
        !app.state.todayWords.some(function (todayWord) { return todayWord.word === entry.word; }) &&
        (app.state.sessionMastery[entry.word] || 0) < app.constants.masteryGoal;
    });
  }

  function getQuestionPool() {
    const today = app.helpers.todayString();
    if (app.state.quizMode === 'new') {
      return app.state.todayWords.filter(function (entry) {
        const inNotebook = app.state.data.notebook.some(function (item) {
          return item.word === entry.word;
        });
        return inNotebook && (app.state.sessionMastery[entry.word] || 0) < app.constants.masteryGoal;
      });
    }
    return getReviewPool(today);
  }

  function renderQuestion(target) {
    const currentDb = app.getCurrentDb();
    const wordEl = document.getElementById('q-word');
    const masteryEl = document.getElementById('q-mastery');
    const optionsEl = document.getElementById('q-options');
    const feedbackEl = document.getElementById('q-feedback');

    if (feedbackEl) {
      feedbackEl.textContent = '';
    }
    if (wordEl) {
      wordEl.textContent = target.word;
    }

    const masteryCount = app.state.sessionMastery[target.word] || 0;
    if (masteryEl) {
      let dots = '';
      for (let index = 0; index < app.constants.masteryGoal; index += 1) {
        dots += '<div class="dot ' + (index < masteryCount ? 'full' : '') + '"></div>';
      }
      masteryEl.innerHTML = dots;
    }

    const options = [target.definition || target.def || ''];
    const allDefinitions = currentDb.map(function (entry) {
      return entry.definition || entry.def || '';
    }).filter(Boolean);
    while (options.length < 3 && allDefinitions.length > options.length) {
      const option = allDefinitions[Math.floor(Math.random() * allDefinitions.length)];
      if (options.indexOf(option) < 0) {
        options.push(option);
      }
    }
    options.sort(function () {
      return Math.random() - 0.5;
    });

    if (optionsEl) {
      optionsEl.innerHTML = options.map(function (option) {
        return '<button class="opt-btn" onclick="checkQuiz(this, ' + JSON.stringify(option) + ', ' + JSON.stringify(target.word) + ')">' +
          app.helpers.escapeHtml(option) +
          '</button>';
      }).join('');
    }
  }

  function updateQuiz() {
    const pool = getQuestionPool();
    const wordEl = document.getElementById('q-word');
    const masteryEl = document.getElementById('q-mastery');
    const optionsEl = document.getElementById('q-options');
    const feedbackEl = document.getElementById('q-feedback');

    app.state.isLocked = false;
    if (feedbackEl) {
      feedbackEl.textContent = '';
    }

    if (!pool.length) {
      const message = app.state.quizMode === 'new'
        ? 'Ajoute les mots du jour pour lancer le defi.'
        : 'Toutes les revisions sont terminees.';
      if (wordEl) {
        wordEl.textContent = 'Salut !';
      }
      if (masteryEl) {
        masteryEl.innerHTML = '';
      }
      if (optionsEl) {
        optionsEl.innerHTML = '<p class="empty-copy">' + app.helpers.escapeHtml(message) + '</p>';
      }
      return;
    }

    const target = pool[Math.floor(Math.random() * pool.length)];
    app.state.currentQuestionWord = target.word;
    renderQuestion(target);
  }

  function showFeedback(message, color) {
    const feedbackEl = document.getElementById('q-feedback');
    if (!feedbackEl) {
      return;
    }
    feedbackEl.textContent = message;
    feedbackEl.style.color = color;
  }

  function showRewardMessage(message, speechText) {
    const text = document.getElementById('rew-val');
    if (text) {
      text.textContent = message;
    }
    if (typeof window.openModal === 'function') {
      window.openModal('rewardModal');
    }
    if (speechText && typeof window.speak === 'function') {
      window.speak(speechText);
    }
  }

  function getReviewCompletionStatus() {
    const today = app.helpers.todayString();
    const reviewWords = (app.state.data.notebook || []).filter(function (item) {
      return item.next === today &&
        (app.state.data.daily_stats.words || []).indexOf(item.word) < 0;
    });
    let mastered = 0;
    reviewWords.forEach(function (item) {
      if ((app.state.sessionMastery[item.word] || 0) >= app.constants.masteryGoal) {
        mastered += 1;
      }
    });
    return {
      total: reviewWords.length,
      mastered: mastered,
      completed: reviewWords.length === 0 || mastered >= reviewWords.length
    };
  }

  function completeBacklogIfNeeded() {
    const backlog = app.state.data.daily_stats.backlog_review || [];
    if (!backlog.length) {
      return;
    }
    const backlogDone = backlog.every(function (word) {
      return (app.state.sessionMastery[word] || 0) >= app.constants.masteryGoal;
    });
    if (!backlogDone) {
      return;
    }
    app.state.data.stars += 20;
    app.state.data.daily_stats.backlog_review = [];
    app.state.data.daily_stats.stars_earned = Number(app.state.data.daily_stats.stars_earned || 0) + 20;
    showRewardMessage('Rattrapage termine ! Bonus +20 etoiles.', 'Bravo');
  }

  function checkDailyCompletion() {
    const today = app.helpers.todayString();
    const todayWords = app.state.todayWords || [];
    let masteredToday = 0;

    todayWords.forEach(function (entry) {
      if ((app.state.sessionMastery[entry.word] || 0) >= app.constants.masteryGoal) {
        masteredToday += 1;
      }
    });

    const reviewStatus = getReviewCompletionStatus();
    const stats = app.state.data.daily_stats || {};

    if (stats.date === today &&
        !stats.completed &&
        masteredToday >= todayWords.length &&
        reviewStatus.completed) {
      app.state.data.daily_stats.completed = true;
      app.state.data.daily_stats.rewarded_at = new Date().toISOString();
      app.state.data.daily_stats.rewarded_stars = 100;
      app.state.data.daily_stats.stars_earned = Number(app.state.data.daily_stats.stars_earned || 0) + 100;
      app.state.data.stars += 100;
      app.updateStreak();
      app.upsertHistoryRecord({
        date: today,
        completed: true,
        starsEarned: app.state.data.daily_stats.stars_earned,
        wordsCount: todayWords.length
      });
      showRewardMessage('Magnifique ! Tous les mots du jour sont termines. +100 etoiles.', 'Felicitations');
    }

    completeBacklogIfNeeded();
  }

  function checkQuiz(button, selectedDefinition, word) {
    if (app.state.isLocked) {
      return;
    }
    app.state.isLocked = true;

    const target = app.findWordInDb(word);
    const notebookItem = app.state.data.notebook.find(function (item) {
      return item.word === word;
    });
    const correctDefinition = target ? (target.definition || target.def || '') : '';
    const buttons = Array.from(document.querySelectorAll('.opt-btn'));
    buttons.forEach(function (item) {
      item.disabled = true;
    });

    if (selectedDefinition === correctDefinition) {
      button.classList.add('correct');
      app.state.sessionMastery[word] = (app.state.sessionMastery[word] || 0) + 1;
      app.state.errorStreak[word] = 0;
      app.state.combo += 1;

      if (notebookItem && app.state.sessionMastery[word] >= app.constants.masteryGoal) {
        notebookItem.lvl = Math.min(6, Number(notebookItem.lvl || 0) + 1);
        notebookItem.err_days = 0;
        notebookItem.next = app.helpers.addDays(app.helpers.todayString(), app.constants.intervals[notebookItem.lvl]);
        showFeedback('Mot maitrise ! Niveau ' + notebookItem.lvl + '.', '#7c3aed');
        if (typeof window.speak === 'function') {
          window.speak('Bravo');
        }
      } else {
        showFeedback('Tres bien !', '#16a34a');
      }

      checkDailyCompletion();

      window.setTimeout(function () {
        if (typeof window.refreshUI === 'function') {
          window.refreshUI();
        }
        updateQuiz();
        if (typeof window.saveData === 'function') {
          window.saveData();
        }
        if (typeof window.saveSession === 'function') {
          window.saveSession();
        }
      }, 900);
      return;
    }

    button.classList.add('wrong');
    buttons.forEach(function (item) {
      if (item.textContent === correctDefinition) {
        item.classList.add('correct');
      }
    });

    app.state.sessionMastery[word] = 0;
    app.state.errorStreak[word] = (app.state.errorStreak[word] || 0) + 1;

    if (app.state.errorStreak[word] >= 2 && notebookItem) {
      notebookItem.lvl = 0;
      notebookItem.next = app.helpers.addDays(app.helpers.todayString(), 1);
      notebookItem.err_days = Number(notebookItem.err_days || 0) + 1;
      app.state.combo = 0;
      app.state.errorStreak[word] = 0;

      if (notebookItem.err_days >= 2) {
        app.state.data.notebook = app.state.data.notebook.filter(function (item) {
          return item.word !== word;
        });
        showFeedback('Mot retire du carnet.', '#dc2626');
      } else {
        showFeedback('Niveau reinitialise.', '#dc2626');
      }
    } else {
      showFeedback('Premiere erreur, recommence.', '#f59e0b');
    }

    if (typeof window.speak === 'function') {
      window.speak('Attention');
    }

    window.setTimeout(function () {
      if (typeof window.refreshUI === 'function') {
        window.refreshUI();
      }
      updateQuiz();
      if (typeof window.saveData === 'function') {
        window.saveData();
      }
      if (typeof window.saveSession === 'function') {
        window.saveSession();
      }
    }, 1400);
  }

  function checkReviewBeforeEnd() {
    const todayWords = app.state.todayWords || [];
    let masteredToday = 0;
    todayWords.forEach(function (entry) {
      if ((app.state.sessionMastery[entry.word] || 0) >= app.constants.masteryGoal) {
        masteredToday += 1;
      }
    });
    const reviewStatus = getReviewCompletionStatus();

    if (masteredToday < todayWords.length) {
      showRewardMessage('Il reste des nouveaux mots a terminer.', 'Continue');
      return;
    }
    if (!reviewStatus.completed) {
      showRewardMessage('Il reste ' + (reviewStatus.total - reviewStatus.mastered) + ' revision(s).', 'Revisions manquantes');
      return;
    }
    if (app.state.data.daily_stats.completed) {
      showRewardMessage('Jour deja valide. Les etoiles ont deja ete creditees.', 'Bravo');
      return;
    }
    showRewardMessage('Toutes les conditions sont reunies. Continue un mot et la validation sera automatique.', 'Bravo');
  }

  window.updateQuiz = updateQuiz;
  window.checkQuiz = checkQuiz;
  window.setQuizMode = setQuizMode;
  window.getReviewCompletionStatus = getReviewCompletionStatus;
  window.checkDailyCompletion = checkDailyCompletion;
  window.checkReviewBeforeEnd = checkReviewBeforeEnd;
})();
