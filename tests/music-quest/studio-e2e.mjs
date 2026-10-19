// Isolated iPad UI regression. All browser traffic is confined to the local preview.
import {chromium} from 'playwright-core';import {mkdirSync,writeFileSync} from 'node:fs';
const BASE='http://127.0.0.1:8083',OUT='audit/music-quest-studio-interaction-20261019';mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const checks=[],errors=[];
const check=(name,pass)=>{checks.push({name,pass:!!pass});console.log((pass?'PASS ':'FAIL ')+name);};
try{const context=await browser.newContext({viewport:{width:834,height:1194},hasTouch:true});await context.route('**/*',r=>new URL(r.request().url()).origin===BASE&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 const goto=async route=>{await p.goto(BASE+'/music-theory/'+route);await p.locator('#app>.page').waitFor();};
 await goto('');
 check('five primary destinations with valid current-page state',await p.locator('.topnav a').count()===5&&await p.locator('.topnav [aria-current=page]').count()===1);
 check('portrait iPad uses a bottom dock',await p.locator('.topbar').evaluate(e=>Math.abs(e.getBoundingClientRect().bottom-innerHeight)<2));
 check('language controls are collapsed by default',!await p.locator('.language-choice').first().isVisible());
 await p.locator('.studio-settings>summary').click();
 check('settings opens with touch-sized language controls',await p.locator('.language-choice').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)));
 await p.keyboard.press('Escape');check('Escape dismisses settings and returns focus',!await p.locator('.studio-settings').evaluate(e=>e.open)&&await p.locator('.studio-settings>summary').evaluate(e=>e===document.activeElement));
 await p.locator('.studio-settings>summary').click();await p.locator('.hero-text').click();check('outside touch dismisses settings',!await p.locator('.studio-settings').evaluate(e=>e.open));
 await goto('#/lesson/w1.clef');
 check('lesson route highlights the map destination',await p.locator('.topnav [aria-current=page]').getAttribute('href')==='#/map');
 check('translation spans carry no nested button decoration',await p.locator('.intro-steps .bi,.intro-steps .lang-zh,.intro-steps .lang-fr').evaluateAll(es=>es.every(e=>{const s=getComputedStyle(e);return parseFloat(s.borderTopWidth)===0&&parseFloat(s.paddingTop)===0;})));
 check('active step text inherits readable foreground',await p.locator('.intro-steps>.on .lang-zh').evaluate(e=>getComputedStyle(e).color===getComputedStyle(e.closest('.on')).color));
 for(let i=0;i<6&&await p.locator('.intro-card').count();i++)await p.locator('.intro-card .q-actions .btn.primary').click();
 await p.locator('section.q').waitFor();await p.locator('.opt').first().click();
 const before=await p.locator('section.q').getAttribute('data-qid');await p.locator('section.q').evaluate(e=>e.dataset.identity='keep-this-question');
 await p.locator('.studio-settings>summary').click();await p.locator('.language-choice').nth(2).click();
 check('French switching retains question and selected answer',await p.locator('section.q').getAttribute('data-qid')===before&&await p.locator('section.q').getAttribute('data-identity')==='keep-this-question'&&await p.locator('.opt[aria-checked=true]').count()===1);
 check('French-only mode hides Chinese labels',await p.locator('.q-prompt .lang-zh').evaluate(e=>getComputedStyle(e).display==='none'));
 await p.locator('.studio-settings>summary').click();await p.setViewportSize({width:1194,height:834});
 check('landscape rotates into a left rail',await p.locator('.topbar').evaluate(e=>e.getBoundingClientRect().left===0&&e.getBoundingClientRect().height===innerHeight&&e.getBoundingClientRect().width>100));
 check('orientation change keeps question and answer',await p.locator('section.q').getAttribute('data-identity')==='keep-this-question'&&await p.locator('.opt[aria-checked=true]').count()===1);
 await p.locator('.studio-settings>summary').click();await p.locator('.language-choice').nth(0).click();await p.locator('.studio-settings>summary').click();
 await p.locator('.topnav a[href="#/learn"]').click();await p.locator('.classroom-index').waitFor();check('navigation closes settings and updates route',!await p.locator('.studio-settings').evaluate(e=>e.open)&&await p.locator('.classroom-index').count()===1);
 await p.locator('.studio-settings>summary').click();await p.locator('.more-links a[href="#/tasks"]').click();await p.waitForFunction(()=>document.body.dataset.view==='tasks'&&!document.querySelector('.studio-settings').open);check('secondary course missions remain accessible',p.url().endsWith('#/tasks')&&!await p.locator('.studio-settings').evaluate(e=>e.open));
 await p.emulateMedia({reducedMotion:'reduce'});await goto('');
 check('reduced motion disables decorative animation',await p.locator('.music-orbit,.hero-companion').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationName==='none')));
 await p.emulateMedia({reducedMotion:'no-preference'});
 for(const size of [{width:768,height:1024},{width:1024,height:768},{width:390,height:844}]){await p.setViewportSize(size);await goto('#/learn/staff');await p.locator('.studio-settings>summary').click();check(`${size.width}px settings remain inside safe bounds`,await p.locator('.settings-panel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));await p.keyboard.press('Escape');check(`${size.width}px all primary nav targets are at least 44px`,await p.locator('.topnav a').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44;})));}
 check('no runtime exceptions',errors.length===0);
 writeFileSync(OUT+'/results.json',JSON.stringify({checks,errors,production_learning_writes:0,physical_ipad_verified:false},null,2));
}finally{await browser.close();}
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' passed');process.exit(checks.every(x=>x.pass)?0:1);
