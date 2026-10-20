// Round 2: isolated end-to-end learning/guardian progression. No production network.
import {chromium} from 'playwright-core';import {mkdirSync,writeFileSync} from 'node:fs';
import {LESSONS,getQuestion} from '../../music-theory/js/content/index.js';
import {createStore,emptyState} from '../../music-theory/js/store.js';import {chapterProgress} from '../../music-theory/js/progression.js';
const BASE='http://127.0.0.1:8083',OUT='audit/music-quest-adventure-round2-edges-20261020';mkdirSync(OUT,{recursive:true});const checks=[],errors=[];
const check=(name,pass)=>{checks.push({name,pass:!!pass});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name);};
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{const c=await b.newContext({viewport:{width:1194,height:834},hasTouch:true});await c.route('**/*',r=>new URL(r.request().url()).origin===BASE&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const goto=async hash=>{await p.goto(BASE+'/music-theory/'+hash);await p.locator('#app>.page').waitFor();};
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('tt_music_quest_v1')));
 const finishFilm=async()=>{await p.locator('video').evaluate(async v=>{if(v.readyState<1)await new Promise(r=>v.addEventListener('loadedmetadata',r,{once:true}));v.currentTime=v.duration-.2;await v.play();});await p.waitForFunction(()=>document.querySelector('video')?.ended);};
 const answer=async(wrong=false)=>{const q=await p.locator('section.q').getAttribute('data-qid'),item=getQuestion(q);if(wrong){if(item.type==='order'){for(const a of [...item.answer].reverse())await p.locator(`.order-pool .tile[data-tile=${JSON.stringify(a)}]`).click();}else if(item.type==='multi'){const a=item.options.find(o=>!item.answer.includes(o.value));await p.locator(`.opt[data-value=${JSON.stringify(a.value)}]`).click();}else if(item.type==='choice')await p.locator(`.opt[data-value=${JSON.stringify(item.options.find(o=>o.value!==item.answer).value)}]`).click();await p.locator('section.q .q-actions .btn.primary').click();await p.locator('.q-feedback.retry').waitFor();await p.locator('.q-feedback button').filter({hasText:'再试一次'}).click();}
 if(item.type==='choice')await p.locator(`.opt[data-value=${JSON.stringify(item.answer)}]`).click();else if(item.type==='multi')for(const a of item.answer)await p.locator(`.opt[data-value=${JSON.stringify(a)}]`).click();else if(item.type==='order')for(const a of item.answer)await p.locator(`.order-pool .tile[data-tile=${JSON.stringify(a)}]`).click();
 await p.locator('section.q .q-actions .btn.primary').click();await p.locator('.q-feedback.good').waitFor();await p.locator('.q-feedback button').filter({hasText:'继续'}).evaluate(b=>{b.click();b.click();});};

 const readyStore=createStore({getItem:()=>null,setItem:()=>{}});
 const ready=(world)=>{const ch=chapterProgress(readyStore.state,world);for(const course of ch.courses){readyStore.setSetting('teachingWatched',{...readyStore.state.settings.teachingWatched,[course.id]:true});readyStore.awardActivity(course.id,'film');readyStore.awardActivity(course.id,'workshop');}for(const l of ch.levels)readyStore.completeLesson(l.id,.8);};ready('w1');
 await goto('');await p.evaluate(s=>localStorage.setItem('tt_music_quest_v1',JSON.stringify(s)),readyStore.state);await p.reload();await goto('#/guardian/w1');
 check('loading old XP never shows a fake upgrade celebration',await p.evaluate(()=>!document.querySelector('#mq-toast')?.textContent.includes('升级')));
 const oldxp=(await state()).xp;await p.locator('.guardian-intro .btn.primary').click();for(let i=0;i<5;i++)await answer(true);await p.locator('.guardian-summary').waitFor();
 check('all wrong first attempts keep guardian locked even after corrected retries',!(await state()).settings.campaignGuardians.w1.clearedAt&&(await p.locator('.big-num').innerText())==='0 / 5');
 check('double Continue cannot skip a question or duplicate completion',Object.values((await state()).days).reduce((n,d)=>n+d.answers,0)===5&&(await state()).settings.campaignGuardians.w1.attempts===1);
 check('a failed guardian does not award chapter bonus or lose old XP',(await state()).xp>=oldxp&&!(await p.locator('.guardian-bonus').innerText()).includes('+30 XP'));
 await goto('#/map');check('failed chapter remains the exact next step',await p.locator('.current-stop>a').getAttribute('href')==='#/guardian/w1');
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('tt_music_quest_v1'));s.lessons['w1.clef'].bestAcc=.4;localStorage.setItem('tt_music_quest_v1',JSON.stringify(s));});await p.reload();await goto('');check('secondary practice recommendation returns to a low-score unfinished level',await p.locator('.today .mission').getAttribute('href')==='#/lesson/w1.clef');
 for(let n=1;n<=6;n++){ready('w'+n);readyStore.completeGuardian('w'+n,1);}await p.evaluate(s=>localStorage.setItem('tt_music_quest_v1',JSON.stringify(s)),readyStore.state);await goto('#/map');await p.reload();await p.locator('#chapter-w6').waitFor();
 check('complete journey shows all 48 steps, 26 levels and six earned seals',await p.locator('.chapter-cleared').count()===6&&(await p.locator('.journey-completion').innerText()).includes('48/48')&&(await p.locator('.journey-completion').innerText()).includes('26/26'));
 check('finished course points to useful review rather than restarting the first film',await p.locator('.journey-next a').getAttribute('href')==='#/review');
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{document.documentElement.dataset.language='fr';});check('French endgame fits narrow screen',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.emulateMedia({reducedMotion:'reduce'});check('new world art respects reduced motion',await p.locator('.island-art').first().evaluate(e=>getComputedStyle(e).animationName==='none'));
 check('no runtime errors',errors.length===0);
}finally{await b.close();writeFileSync(OUT+'/results.json',JSON.stringify({checks,errors,production_learning_writes:0,fixtures:'isolated browser only'},null,2));}
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' passed');
