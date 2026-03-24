(function () {
  const app = window.FrenchMotApp;

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'block';
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function showToast(message, background) {
    const toast = document.createElement('div');
    toast.className = 'floating-toast';
    toast.style.background = background || 'var(--p)';
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, 2400);
  }

  function speak(text) {
    if (!app.state.voiceEnabled || !(app.config.features && app.config.features.voiceEnabled)) {
      return;
    }
    if (!('speechSynthesis' in window)) {
      showToast('Lecture vocale indisponible', '#dc2626');
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = (app.config.voice && app.config.voice.lang) || 'fr-FR';
      utterance.rate = (app.config.voice && app.config.voice.rate) || 0.92;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      app.logger.warn('speech failed', error);
    }
  }

  function toggleVoice() {
    app.setVoiceEnabled(!app.state.voiceEnabled);
    showToast(app.state.voiceEnabled ? 'Voix activee' : 'Voix coupee', app.state.voiceEnabled ? '#0f766e' : '#475569');
  }

  function updateVoiceButton() {
    const button = document.getElementById('voice-toggle');
    if (!button) {
      return;
    }
    button.textContent = app.state.voiceEnabled ? 'Voix ON' : 'Voix OFF';
    button.classList.toggle('ghost-off', !app.state.voiceEnabled);
  }

  function updateProgressBars() {
    const todayWords = app.state.todayWords || [];
    let masteredToday = 0;
    todayWords.forEach(function (item) {
      if ((app.state.sessionMastery[item.word] || 0) >= app.constants.masteryGoal) {
        masteredToday += 1;
      }
    });

    const reviewStatus = typeof window.getReviewCompletionStatus === 'function'
      ? window.getReviewCompletionStatus()
      : { total: 0, mastered: 0 };
    const todayDone = todayWords.length === 0 ? 100 : (masteredToday / todayWords.length) * 100;
    const reviewDone = reviewStatus.total === 0 ? 100 : (reviewStatus.mastered / reviewStatus.total) * 100;

    const barNew = document.getElementById('bar-n');
    const barRev = document.getElementById('bar-r');
    const progressText = document.getElementById('ui-progress');
    const completionText = document.getElementById('ui-completion-status');

    if (barNew) {
      barNew.style.width = todayDone + '%';
    }
    if (barRev) {
      barRev.style.width = reviewDone + '%';
    }
    if (progressText) {
      progressText.textContent = Math.round((todayDone + reviewDone) / 2) + '%';
    }
    if (!completionText) {
      return;
    }

    if (app.state.data.daily_stats.completed) {
      completionText.textContent = 'Bravo ! Jour termine, recompense creditee.';
      completionText.style.color = 'var(--s)';
      return;
    }

    if (todayDone === 100 && reviewDone === 100) {
      completionText.textContent = 'Tous les mots et revisions sont termines.';
      completionText.style.color = 'var(--s)';
    } else if (todayDone === 100) {
      completionText.textContent = 'Nouveaux mots termines, il reste des revisions.';
      completionText.style.color = '#f59e0b';
    } else {
      completionText.textContent = 'Nouveaux: ' + masteredToday + '/' + todayWords.length + ' | Revisions: ' + reviewStatus.mastered + '/' + reviewStatus.total;
      completionText.style.color = '#475569';
    }
  }

  function renderWordList() {
    const list = document.getElementById('ui-words-list');
    if (!list) {
      return;
    }
    if (!Array.isArray(app.state.todayWords) || app.state.todayWords.length === 0) {
      list.innerHTML = '<p class="empty-copy">Aucun mot a apprendre aujourd\'hui.</p>';
      return;
    }

    list.innerHTML = app.state.todayWords.map(function (word) {
      const isAdded = app.state.data.notebook.some(function (item) {
        return item.word === word.word;
      });
      return '' +
        '<div class="daily-item">' +
          '<div class="mot">' + app.helpers.escapeHtml(word.word) + '</div>' +
          '<div class="definition">' + app.helpers.escapeHtml(word.definition || word.def || '') + '</div>' +
          '<div class="exemple">"' + app.helpers.escapeHtml(word.example || word.ex || '') + '"</div>' +
          '<div class="action-row">' +
            '<button class="action-btn" onclick="speak(' + JSON.stringify(word.word) + ')">Ecouter</button>' +
            '<button class="action-btn ' + (isAdded ? 'btn-muted' : '') + '" onclick="addWord(' + JSON.stringify(word.word) + ')">' + (isAdded ? 'Ajoute' : 'Ajouter') + '</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function refreshUI() {
    const starsEl = document.getElementById('ui-stars');
    const trophiesEl = document.getElementById('ui-trophies');
    const countEl = document.getElementById('ui-count');
    const streakEl = document.getElementById('ui-streak');

    if (starsEl) {
      starsEl.textContent = String(app.state.data.stars || 0);
    }
    if (trophiesEl) {
      trophiesEl.textContent = String(Math.floor((app.state.data.stars || 0) / 1000));
    }
    if (countEl) {
      countEl.textContent = String((app.state.data.notebook || []).length);
    }
    if (streakEl) {
      streakEl.textContent = String(app.state.data.streak && app.state.data.streak.current || 0);
    }

    renderWordList();
    updateProgressBars();
    renderNotebook(document.getElementById('nb-search') ? document.getElementById('nb-search').value.trim() : '');
    renderDashboard();
  }

  function renderNotebook(filterText) {
    const notebook = app.state.data.notebook || [];
    const nbList = document.getElementById('nb-list');
    const nbTotal = document.getElementById('nb-total');
    const nbStats = document.getElementById('nb-stats');
    const today = app.helpers.todayString();

    if (!nbList) {
      return;
    }

    let items = notebook.slice();
    if (filterText) {
      const query = filterText.toLowerCase();
      items = items.filter(function (item) {
        const entry = app.findWordInDb(item.word) || {};
        return item.word.toLowerCase().indexOf(query) >= 0 ||
          String(entry.definition || '').toLowerCase().indexOf(query) >= 0;
      });
    }

    if (nbTotal) {
      nbTotal.textContent = '(' + items.length + ' mots)';
    }

    const dueToday = items.filter(function (item) { return item.next === today; }).length;
    const overdue = items.filter(function (item) { return item.next && item.next < today; }).length;
    const difficult = items.filter(function (item) { return item.err_days > 0; }).length;
    if (nbStats) {
      nbStats.innerHTML = '' +
        '<div class="nb-stat"><div class="nb-stat-value">' + items.length + '</div><div>Total</div></div>' +
        '<div class="nb-stat"><div class="nb-stat-value" style="color:#f59e0b">' + dueToday + '</div><div>A reviser</div></div>' +
        '<div class="nb-stat"><div class="nb-stat-value" style="color:#dc2626">' + difficult + '</div><div>Difficiles</div></div>' +
        '<div class="nb-stat"><div class="nb-stat-value" style="color:#7c3aed">' + overdue + '</div><div>En retard</div></div>';
    }

    if (items.length === 0) {
      nbList.innerHTML = filterText
        ? '<div class="nb-empty">Aucun mot ne correspond a la recherche.</div>'
        : '<div class="nb-empty">Ton carnet est vide.</div>';
      return;
    }

    const groups = {
      beginner: { title: 'Debutant', items: [], className: 'nb-beginner', expanded: true },
      consolidating: { title: 'Consolidation', items: [], className: 'nb-consolidating', expanded: false },
      advanced: { title: 'Avance', items: [], className: 'nb-advanced', expanded: false },
      mastered: { title: 'Maitrise', items: [], className: 'nb-mastered', expanded: false }
    };

    items.forEach(function (item) {
      const entry = app.findWordInDb(item.word);
      const enriched = Object.assign({}, item, { entry: entry });
      if ((item.lvl || 0) <= 1) {
        groups.beginner.items.push(enriched);
      } else if ((item.lvl || 0) <= 3) {
        groups.consolidating.items.push(enriched);
      } else if ((item.lvl || 0) <= 5) {
        groups.advanced.items.push(enriched);
      } else {
        groups.mastered.items.push(enriched);
      }
    });

    let html = '';
    Object.keys(groups).forEach(function (key) {
      const group = groups[key];
      if (group.items.length === 0) {
        return;
      }
      const collapsedClass = filterText || group.expanded ? '' : 'collapsed';
      const arrow = collapsedClass ? '▶' : '▼';
      html += '' +
        '<div class="nb-group">' +
          '<div class="nb-group-header ' + group.className + '" onclick="toggleGroup(' + JSON.stringify(key) + ')">' +
            '<span>' + arrow + ' ' + group.title + '</span>' +
            '<span class="nb-group-count">' + group.items.length + '</span>' +
          '</div>' +
          '<div class="nb-group-content ' + collapsedClass + '" id="nb-group-' + key + '">';

      group.items.forEach(function (item) {
        const isDue = item.next && item.next <= today && !app.state.todayWords.some(function (todayWord) {
          return todayWord.word === item.word;
        });
        const classes = item.err_days > 0 ? 'nb-word-error' : isDue ? 'nb-word-due' : '';
        html += '' +
          '<div class="notebook-item ' + classes + '" onclick="showDetail(' + JSON.stringify(item.word) + ')">' +
            '<div style="display:flex;flex-direction:column;flex:1;">' +
              '<span style="font-size:1.05em;"><strong>' + app.helpers.escapeHtml(item.word) + '</strong></span>' +
              '<span style="font-size:0.85em;color:#64748b;">' + app.helpers.escapeHtml(item.entry && item.entry.definition || '') + '</span>' +
              '<span style="font-size:0.75em;color:#94a3b8;">Prochaine: ' + app.helpers.escapeHtml(item.next || 'a definir') + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<span class="lvl-badge">Lvl ' + Number(item.lvl || 0) + '</span>' +
              '<button class="mini-icon-btn" onclick="event.stopPropagation(); speak(' + JSON.stringify(item.word) + ')">🔊</button>' +
            '</div>' +
          '</div>';
      });

      html += '</div></div>';
    });

    nbList.innerHTML = html;
  }

  function toggleGroup(key) {
    const section = document.getElementById('nb-group-' + key);
    if (!section) {
      return;
    }
    section.classList.toggle('collapsed');
    const header = section.previousElementSibling;
    const title = header && header.querySelector('span');
    if (title) {
      const label = title.textContent.replace(/^.\s/, '');
      title.textContent = (section.classList.contains('collapsed') ? '▶ ' : '▼ ') + label;
    }
  }

  function filterNotebook() {
    const input = document.getElementById('nb-search');
    renderNotebook(input ? input.value.trim() : '');
  }

  function showDetail(word) {
    const entry = app.findWordInDb(word);
    const detailCard = document.getElementById('detail-card');
    if (!entry || !detailCard) {
      return;
    }
    detailCard.innerHTML = '' +
      '<h2>' + app.helpers.escapeHtml(entry.word) + '</h2>' +
      '<p><strong>Definition</strong><br>' + app.helpers.escapeHtml(entry.definition || entry.def || '') + '</p>' +
      '<p><strong>Exemple</strong><br><em>' + app.helpers.escapeHtml(entry.example || entry.ex || '') + '</em></p>' +
      '<button class="action-btn" style="width:100%;margin-top:20px;" onclick="speak(' + JSON.stringify(entry.word) + ')">Ecouter</button>';
    openModal('detailModal');
  }

  function openNotebook() {
    renderNotebook('');
    if (typeof window.updateBacklogButton === 'function') {
      window.updateBacklogButton();
    }
    openModal('nbModal');
  }

  function renderTrendBars(records, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }
    const maxStars = Math.max.apply(Math, records.map(function (record) {
      return record.starsEarned || 0;
    }).concat([20]));
    container.innerHTML = records.map(function (record) {
      const height = Math.max(8, Math.round(((record.starsEarned || 0) / maxStars) * 64));
      return '' +
        '<div class="trend-bar-wrap">' +
          '<div class="trend-bar ' + (record.completed ? 'done' : '') + '" style="height:' + height + 'px"></div>' +
          '<span>' + record.date.slice(5) + '</span>' +
        '</div>';
    }).join('');
  }

  function renderDashboard() {
    const weekRecords = app.buildTrendWindow((app.config.ui && app.config.ui.trendDaysWeek) || 7);
    const monthRecords = app.buildTrendWindow((app.config.ui && app.config.ui.trendDaysMonth) || 30);
    const weekSummary = document.getElementById('dash-week-summary');
    const monthSummary = document.getElementById('dash-month-summary');

    const weekCompleted = weekRecords.filter(function (record) { return record.completed; }).length;
    const monthCompleted = monthRecords.filter(function (record) { return record.completed; }).length;
    const weekStars = weekRecords.reduce(function (sum, record) { return sum + (record.starsEarned || 0); }, 0);
    const monthStars = monthRecords.reduce(function (sum, record) { return sum + (record.starsEarned || 0); }, 0);

    if (weekSummary) {
      weekSummary.innerHTML = '' +
        '<strong>' + weekCompleted + '/7 jours completes</strong>' +
        '<span>' + weekStars + ' etoiles gagnees</span>';
    }
    if (monthSummary) {
      monthSummary.innerHTML = '' +
        '<strong>' + monthCompleted + '/30 jours completes</strong>' +
        '<span>' + monthStars + ' etoiles gagnees</span>';
    }

    renderTrendBars(weekRecords, 'dash-week-trend');
    renderTrendBars(monthRecords.slice(-14), 'dash-month-trend');
  }

  document.addEventListener('click', function (event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });

  window.refreshUI = refreshUI;
  window.updateProgressBars = updateProgressBars;
  window.renderNotebook = renderNotebook;
  window.toggleGroup = toggleGroup;
  window.filterNotebook = filterNotebook;
  window.showDetail = showDetail;
  window.openNotebook = openNotebook;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.speak = speak;
  window.toggleVoice = toggleVoice;
  window.updateVoiceButton = updateVoiceButton;
  window.renderDashboard = renderDashboard;
  window.showToast = showToast;
})();
