/**
 * Tongtong French Learning - Configuration (v4.0)
 * 集中配置管理
 */
window.TongtongConfig = Object.freeze({
  appVersion: '4.0',
  lastUpdate: '2026-03-24',
  
  features: {
    voiceEnabled: true,      // 语音朗读
    exportEnabled: true,     // 数据导出
    debugMode: false         // 调试模式（生产环境关闭）
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
    syncQueue: 'french_sync_queue'
  }
});
