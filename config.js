window.TongtongConfig = Object.freeze({
  appVersion: '4.0',
  lastUpdate: '2026-03-24',
  logLevel: 'silent',
  network: {
    macIp: '192.168.32.70',
    port: '3333'
  },
  ui: {
    syncStatusResetMs: 3000,
    trendDaysWeek: 7,
    trendDaysMonth: 30
  },
  voice: {
    enabled: true,
    lang: 'fr-FR',
    rate: 0.92
  },
  features: {
    voiceEnabled: true,
    exportEnabled: true,
    dashboardEnabled: true,
    debugMode: false
  },
  supabase: {
    url: 'https://ghbmmnapyupusmyxjkvv.supabase.co',
    key: 'sb_publishable_MkMhoECq7wo5qFi3K9Shcg_7LiPM1oU'
  },
  cacheKeys: {
    learningData: 'french_learning_data',
    appVersion: 'french_app_version',
    sessionMastery: 'french_session_mastery',
    sessionData: 'french_session_data',
    lastValidStars: 'last_valid_stars',
    lastValidWordCount: 'last_valid_word_count',
    syncQueue: 'french_sync_queue',
    statsHistory: 'french_stats_history',
    voiceEnabled: 'french_voice_enabled'
  }
});
