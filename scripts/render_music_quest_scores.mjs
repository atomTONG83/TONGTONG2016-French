import {chromium} from 'playwright-core';import {mkdirSync} from 'node:fs';
const dir='tmp/music-quest-video-scores';mkdirSync(dir,{recursive:true});
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{const p=await b.newPage({viewport:{width:1000,height:650},deviceScaleFactor:2});await p.goto('http://127.0.0.1:8082/');
await p.evaluate(async()=>{window.sv=(await import('/js/ui/staff.js')).staffView;document.body.innerHTML='<div id="score" style="width:850px;background:#f8f5ff;padding:20px;border-radius:20px"></div>';});
const ns=['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5'];
for(let i=0;i<ns.length;i++){const n=ns[i];await p.evaluate(n=>document.querySelector('#score').replaceChildren(window.sv({keyCount:0,notes:[{step:n[0],octave:+n[1],dur:'w',measure:1}],highlight:[0]})),n);await p.locator('#score').screenshot({path:`${dir}/staff-${i}.png`});}
for(let mode=0;mode<3;mode++){await p.evaluate(mode=>{const notes=[{step:'F',octave:4,acc:mode?'n':null,dur:'q',measure:1},{step:'F',octave:4,dur:'q',measure:1},{step:'F',octave:5,dur:'h',measure:1},{step:'F',octave:4,dur:'w',measure:2}];document.querySelector('#score').replaceChildren(window.sv({keyCount:2,notes,highlight:mode===0?[0,1,2,3]:mode===1?[0,1]:[3]}));},mode);await p.locator('#score').screenshot({path:`${dir}/acc-${mode}.png`});}
}finally{await b.close();}
