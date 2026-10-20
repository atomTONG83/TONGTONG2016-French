// Isolated QA only. Never send production requests or write a real child's records.
import {chromium} from 'playwright-core';import {mkdirSync,writeFileSync} from 'node:fs';
const BASE=(process.argv[2]||'http://127.0.0.1:8083').replace(/\/$/,'');
if(!['127.0.0.1','localhost'].includes(new URL(BASE).hostname))throw Error('Use an isolated loopback test server only.');
const OUT=process.env.E2E_OUT||'audit/music-quest-v2-browser-20261019';mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[],errors=[],requests=[],responses=[];const check=(name,pass)=>{results.push({name,pass:!!pass});console.log((pass?'PASS ':'FAIL ')+name);};
try{
 const ctx=await browser.newContext({viewport:{width:1200,height:1000},ignoreHTTPSErrors:true});
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(BASE).origin&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
 if(BASE.startsWith('https:')){const response=await ctx.request.post(BASE+'/auth/login',{headers:{Origin:BASE},data:{username:'tongtong',password:'local-music-preview-only'}});check('isolated local Worker cookie login',response.status()===200);}
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));p.on('response',r=>responses.push(r.url()));
 const goto=async hash=>{await p.goto(BASE+'/music-theory/'+hash);await p.locator('#app>.page').waitFor();};
 const xp=()=>p.evaluate(()=>(JSON.parse(localStorage.getItem('tt_music_quest_v1'))?.xp||0));
 const finishFilm=async()=>{await p.locator('video').evaluate(async v=>{if(v.readyState<1)await new Promise(r=>v.addEventListener('loadedmetadata',r,{once:true}));v.currentTime=v.duration-.2;await v.play();});await p.waitForFunction(()=>document.querySelector('video').ended);};
 await goto('');check('teaching-first home with daily goal and four badges',await p.locator('.teaching-dashboard').count()===1&&await p.locator('.achievement').count()===4);
 await p.locator('.hero-copy .btn.primary').click();await p.locator('video').waitFor();await p.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
 check('film precedes interaction and practice',await p.locator('.teaching-workspace').count()===0&&await p.locator('.cinema-shell>.btn.primary').isDisabled());
 check('five learning phases',await p.locator('.learning-pipeline li').count()===5);
 check('readable synchronized bilingual captions below the film',await p.locator('.synchronized-caption .lang-fr').count()>0);
 check('metadata loads without earning reward',Number.isFinite(await p.locator('video').evaluate(v=>v.duration))&&await xp()===0);
 await p.locator('video').evaluate(async v=>{await v.play();});await p.waitForFunction(()=>{const v=document.querySelector('video');return v.currentTime>.2&&v.getVideoPlaybackQuality().totalVideoFrames>1;},null,{timeout:15000});
 check('actual H264 frames decode and time advances',await p.locator('video').evaluate(v=>v.currentTime>.2&&v.getVideoPlaybackQuality().totalVideoFrames>1));
 check('playing without completion gives no XP',await xp()===0);
 await finishFilm();check('film completion gives 10 XP only once',await xp()===10);
 check('film completion does not manufacture answer or skill records',await p.evaluate(()=>{let s=JSON.parse(localStorage.getItem('tt_music_quest_v1'));return !Object.keys(s.items).length&&!Object.keys(s.skills).length;}));
 await p.locator('.cinema-languages button').nth(1).click();await p.waitForTimeout(400);check('French film source selectable',await p.locator('video').evaluate(v=>v.currentSrc.endsWith('staff-fr.mp4')));
 await finishFilm();check('replaying another language cannot duplicate film XP',await xp()===10);
 await p.locator('.cinema-shell>.btn.primary').click();await p.locator('.scene-staff').waitFor();
 const before=await p.locator('.note-name').innerText();await p.locator('.scene-staff .q-actions button').nth(0).click();check('staff elevator changes the note',before!==await p.locator('.note-name').innerText());await p.locator('.scene-staff .q-actions button').nth(1).click();
 await p.locator('[data-voice=fr]').click();await p.waitForTimeout(300);check('French Microsoft MP3 requested',requests.some(u=>/audio\/voice\/[a-f0-9]+\.mp3/.test(u)));
 await p.locator('[data-voice=zh]').click();await p.waitForTimeout(200);check('only one explanation speaks at a time',await p.locator('.voice-btn.speaking').count()<=1);
 await p.locator('.studio-settings>summary').click();await p.locator('.language-choice').nth(2).click();check('French display switch keeps current workshop',await p.locator('.scene-staff').count()===1&&await p.locator('.lang-zh').first().evaluate(e=>getComputedStyle(e).display)==='none');
 await p.locator('.language-choice').nth(0).click();await p.locator('.studio-settings>summary').click();
 for(let i=0;i<4;i++)await p.locator('.workshop-footer>.btn.primary').click();await p.locator('.practice-bridge').waitFor();check('exploration awards 5 XP separately',await xp()===15);
 check('practice and review and game assessment are separate entries',await p.locator('.practice-bridge a').count()===3);
 for(const id of ['sharps','accidentals','steps','rhythm','violin','ear','detective']){await goto('#/learn/'+id);await finishFilm();await p.locator('.cinema-shell>.btn.primary').click();await p.locator('.teaching-workspace').waitFor();check('interactive teaching scene '+id,await p.locator('.scene-'+(id==='sharps'?'chain':id)).count()===1);await p.locator('.teaching-workspace button').first().click();}
 await goto('#/challenge');check('films alone do not unlock knowledge assessment',await p.locator('.challenge-lock').count()===1);
 await p.evaluate(()=>{let s=JSON.parse(localStorage.getItem('tt_music_quest_v1'));s.lessons['w1.clef']={completed:1,bestAcc:.75,lastAt:new Date().toISOString()};localStorage.setItem('tt_music_quest_v1',JSON.stringify(s));});
 await p.reload();await p.locator('.intro-card').waitFor();check('completed practice fixture unlocks game assessment',await p.locator('.intro-card').count()===1);
 for(const size of [{width:375,height:812},{width:768,height:1024}]){await p.setViewportSize(size);for(const route of ['', '#/learn','#/learn/staff','#/map','#/parent']){await goto(route);check(`${size.width}px no overflow ${route||'home'}`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await goto('');await p.screenshot({path:`${OUT}/${size.width}-home.png`,fullPage:true});}
 await p.setViewportSize({width:1200,height:1000});await goto('#/learn/rhythm');await p.screenshot({path:OUT+'/cinema.png',fullPage:true});
 check('no runtime errors',errors.length===0);check('no production HTTP requests',responses.every(u=>new URL(u).origin===new URL(BASE).origin));
 writeFileSync(OUT+'/results.json',JSON.stringify({results,errors,production_learning_writes:0,film_completion_test:'automated seek-to-end, not human viewing verification'},null,2));
}finally{await browser.close();}
console.log(results.filter(r=>r.pass).length+'/'+results.length+' passed');process.exit(results.every(r=>r.pass)?0:1);
