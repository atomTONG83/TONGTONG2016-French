// french_diagnostic.js - 法语学习页面诊断工具
// 在浏览器控制台运行此代码来诊断问题

(function() {
    console.log('=== 🔍 法语学习页面诊断工具 ===\n');
    
    // 1. 检查 LocalStorage 数据
    console.log('1️⃣ LocalStorage 数据检查:');
    const localData = localStorage.getItem('french_learning_data');
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            console.log('  ✅ french_learning_data 存在');
            console.log(`     - 星星: ${parsed.stars}`);
            console.log(`     - 生词本: ${parsed.notebook?.length || 0} 个单词`);
            console.log(`     - 每日日期: ${parsed.daily_stats?.date}`);
            console.log(`     - 完成状态: ${parsed.daily_stats?.completed}`);
            console.log(`     - 今日单词: ${parsed.daily_stats?.words?.length || 0} 个`);
        } catch (e) {
            console.log('  ❌ french_learning_data 解析失败:', e.message);
        }
    } else {
        console.log('  ⚠️ french_learning_data 不存在');
    }
    
    // 2. 检查会话数据
    const sessionData = localStorage.getItem('french_session_data');
    if (sessionData) {
        try {
            const parsed = JSON.parse(sessionData);
            console.log('  ✅ french_session_data 存在');
            console.log(`     - 日期: ${parsed.date}`);
            console.log(`     - sessionMastery: ${Object.keys(parsed.sessionMastery || {}).length} 个单词`);
        } catch (e) {
            console.log('  ❌ french_session_data 解析失败:', e.message);
        }
    } else {
        console.log('  ⚠️ french_session_data 不存在');
    }
    
    // 3. 检查 Supabase 状态
    console.log('\n2️⃣ Supabase 状态检查:');
    if (window.FrenchSupabase) {
        console.log('  ✅ FrenchSupabase 对象存在');
        console.log(`     - supabaseReady: ${window.FrenchSupabase.supabaseReady}`);
        console.log(`     - isOnline: ${window.FrenchSupabase.isOnline ? window.FrenchSupabase.isOnline() : 'N/A'}`);
        console.log(`     - 同步队列: ${window.FrenchSupabase.syncQueue ? window.FrenchSupabase.syncQueue().length : 'N/A'} 个`);
    } else {
        console.log('  ❌ FrenchSupabase 对象不存在');
    }
    
    // 4. 检查全局变量 gData
    console.log('\n3️⃣ 全局变量检查:');
    if (typeof gData !== 'undefined') {
        console.log('  ✅ gData 存在');
        console.log(`     - 星星: ${gData.stars}`);
        console.log(`     - 生词本: ${gData.notebook?.length || 0} 个单词`);
        console.log(`     - 每日日期: ${gData.daily_stats?.date}`);
        console.log(`     - 完成状态: ${gData.daily_stats?.completed}`);
    } else {
        console.log('  ❌ gData 不存在（页面可能还没加载完）');
    }
    
    // 5. 检查验证状态
    console.log('\n4️⃣ 验证状态检查:');
    const lastValidStars = localStorage.getItem('last_valid_stars');
    const lastValidCount = localStorage.getItem('last_valid_word_count');
    console.log(`  last_valid_stars: ${lastValidStars || '未设置'}`);
    console.log(`  last_valid_word_count: ${lastValidCount || '未设置'}`);
    
    // 6. 网络状态
    console.log('\n5️⃣ 网络状态:');
    console.log(`  navigator.onLine: ${navigator.onLine}`);
    
    // 7. 提供修复建议
    console.log('\n=== 🔧 修复建议 ===');
    console.log('如果生词本显示为空，尝试以下步骤:');
    console.log('1. 清除 LocalStorage: localStorage.removeItem("french_learning_data")');
    console.log('2. 刷新页面，让系统从服务器重新加载数据');
    console.log('3. 或者运行: window.location.reload()');
    
    console.log('\n如果 validation failed，检查:');
    console.log('- 星星数是否是100的倍数');
    console.log('- notebook 是否是数组');
    console.log('- daily_stats 是否包含 date 和 completed 字段');
    
    // 导出修复函数
    window.FrenchDiagnostic = {
        clearLocalStorage: function() {
            localStorage.removeItem('french_learning_data');
            localStorage.removeItem('french_session_data');
            localStorage.removeItem('french_sync_queue');
            console.log('✅ LocalStorage 已清除，请刷新页面');
        },
        
        forceReloadFromServer: async function() {
            localStorage.removeItem('french_learning_data');
            console.log('🔄 正在从服务器重新加载数据...');
            if (typeof init === 'function') {
                await init();
                console.log('✅ 数据已重新加载');
            } else {
                console.log('❌ init() 函数不可用，请刷新页面');
            }
        },
        
        validateCurrentData: function() {
            if (typeof gData === 'undefined') {
                console.log('❌ gData 不存在');
                return false;
            }
            
            const errors = [];
            
            if (!gData.stars) errors.push('缺少 stars');
            if (!Array.isArray(gData.notebook)) errors.push('notebook 不是数组');
            if (!gData.daily_stats) errors.push('缺少 daily_stats');
            if (gData.daily_stats && !gData.daily_stats.date) errors.push('daily_stats 缺少 date');
            if (gData.daily_stats && typeof gData.daily_stats.completed !== 'boolean') {
                errors.push('daily_stats.completed 不是布尔值');
            }
            
            if (errors.length > 0) {
                console.log('❌ 数据验证失败:');
                errors.forEach(e => console.log(`   - ${e}`));
                return false;
            }
            
            console.log('✅ 数据验证通过');
            return true;
        }
    };
    
    console.log('\n=== 📋 可用修复函数 ===');
    console.log('FrenchDiagnostic.clearLocalStorage() - 清除本地存储');
    console.log('FrenchDiagnostic.forceReloadFromServer() - 强制从服务器重新加载');
    console.log('FrenchDiagnostic.validateCurrentData() - 验证当前数据');
    
})();
