// Locally served Microsoft Edge natural voice files; no speech text leaves the browser.
import {h} from './ui/dom.js';
import {french,register} from './i18n.js';
export function voiceKey(lang,text){let h=2166136261;for(const c of `${lang}:${text}`){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
let player=null,active=null,rate=1,generation=0;
export function stopNarration(){generation++;if(player){player.pause();player.removeAttribute('src');player.load();}if(active){active.classList.remove('speaking');active.setAttribute('aria-pressed','false');}active=null;document.documentElement.classList.remove('voice-playing');}
register('中文讲解','Explication en chinois');register('法语讲解','Explication en français');register('停止讲解','Arrêter la narration');register('微软自然语音 · 点击收听','Voix naturelle Microsoft · toucher pour écouter');register('语音暂不可用，请阅读下方双语讲解。','Audio indisponible. Lis l’explication bilingue ci-dessous.');
export function narration(zh,fr=french(zh)){
 if(!zh||!fr)return null;
 const status=h('span',{class:'voice-status','aria-live':'polite'});
 const wrap=h('div',{class:'narration','data-narration':'', 'data-zh':zh,'data-fr':fr},
  h('span',{class:'voice-label'},'微软自然语音 · 点击收听'));
 const play=(lang,text,label)=>h('button',{type:'button',class:'btn voice-btn small','data-voice':lang,'aria-pressed':'false',onclick:async e=>{
  const btn=e.currentTarget;if(active===btn){stopNarration();return;}
  stopNarration();const token=++generation;window.dispatchEvent(new Event('mq:narration-start'));
  player??=new Audio();player.preload='none';player.src=new URL(`../audio/voice/${voiceKey(lang,text)}.mp3`,import.meta.url).href;player.playbackRate=rate;
  active=btn;btn.classList.add('speaking');btn.setAttribute('aria-pressed','true');document.documentElement.classList.add('voice-playing');
  player.onended=()=>{if(token===generation)stopNarration();};player.onerror=()=>{if(token!==generation)return;stopNarration();status.replaceChildren(h('span',{},'语音暂不可用，请阅读下方双语讲解。'));};
  try{await player.play();status.textContent='';}catch{if(token!==generation)return;stopNarration();status.replaceChildren(h('span',{},'语音暂不可用，请阅读下方双语讲解。'));}
 }},label);
 wrap.append(play('zh',zh,'🔊 中文讲解'),play('fr',fr,'🔊 Français'),h('button',{type:'button',class:'btn ghost small',onclick:stopNarration},'⏹'),status);
 return wrap;
}
export function voiceRateControl(){const s=h('select',{'aria-label':'语速 / Vitesse de narration',onchange:e=>{rate=Number(e.target.value);if(player)player.playbackRate=rate;}},...[[.8,'0.8×'],[1,'1×'],[1.15,'1.15×']].map(([value,label])=>h('option',{value,selected:value===1},label)));return h('label',{class:'voice-rate'},'🎙 ',s);}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)stopNarration();});
