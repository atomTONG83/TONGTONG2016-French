(function () {
  const app = window.FrenchMotApp;

  function addWord(word) {
    if (app.state.data.notebook.some(function (item) { return item.word === word; })) {
      if (typeof window.showToast === 'function') {
        window.showToast('Mot deja present', '#475569');
      }
      return;
    }

    app.state.data.notebook.push({
      word: word,
      lvl: 0,
      next: app.helpers.todayString(),
      err_days: 0
    });
    app.state.sessionMastery[word] = 0;
    app.state.errorStreak[word] = 0;

    if (typeof window.showToast === 'function') {
      window.showToast('Mot ajoute au carnet', '#2563eb');
    }
    if (typeof window.speak === 'function') {
      window.speak('Ajoute');
    }
    if (typeof window.refreshUI === 'function') {
      window.refreshUI();
    }
    if (typeof window.saveSession === 'function') {
      window.saveSession();
    }
    window.setTimeout(function () {
      if (typeof window.saveData === 'function') {
        window.saveData();
      }
      if (typeof window.updateQuiz === 'function') {
        window.updateQuiz();
      }
    }, 120);
  }

  function removeWord(word) {
    const before = app.state.data.notebook.length;
    app.state.data.notebook = app.state.data.notebook.filter(function (item) {
      return item.word !== word;
    });
    delete app.state.sessionMastery[word];
    delete app.state.errorStreak[word];
    if (app.state.data.notebook.length !== before) {
      if (typeof window.refreshUI === 'function') {
        window.refreshUI();
      }
      if (typeof window.saveData === 'function') {
        window.saveData();
      }
    }
  }

  function updateBacklogButton() {
    const button = document.getElementById('backlog-btn');
    const count = document.getElementById('backlog-count');
    if (!button || !count) {
      return;
    }
    const today = app.helpers.todayString();
    const backlog = app.state.data.notebook.filter(function (item) {
      return item.next && item.next < today;
    });
    button.style.display = backlog.length > 0 ? 'block' : 'none';
    count.textContent = String(backlog.length);
  }

  function startBacklogReview() {
    const today = app.helpers.todayString();
    const backlog = app.state.data.notebook.filter(function (item) {
      return item.next && item.next < today;
    });

    if (backlog.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast('Aucun mot en retard', '#0f766e');
      }
      return;
    }

    const selected = backlog
      .slice()
      .sort(function () { return Math.random() - 0.5; })
      .slice(0, Math.min(10, backlog.length))
      .map(function (item) { return item.word; });

    app.state.data.daily_stats.backlog_review = selected;
    if (typeof window.closeModal === 'function') {
      window.closeModal('nbModal');
    }
    if (typeof window.setQuizMode === 'function') {
      window.setQuizMode('rev');
    }
    if (typeof window.openModal === 'function') {
      const message = document.getElementById('rew-val');
      if (message) {
        message.textContent = 'Mode rattrapage active pour ' + selected.length + ' mot(s).';
      }
      window.openModal('rewardModal');
    }
    if (typeof window.saveData === 'function') {
      window.saveData();
    }
  }

  window.addWord = addWord;
  window.removeWord = removeWord;
  window.updateBacklogButton = updateBacklogButton;
  window.startBacklogReview = startBacklogReview;
})();
