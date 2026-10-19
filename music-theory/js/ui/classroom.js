import {h,svgEl,sparkle} from './dom.js';
import {STUDIOS} from '../teaching-content.js';
import {FILMS} from '../teaching-films.js';
import {bilingual,register,setText} from '../i18n.js';
import {narration,stopNarration} from '../voice.js';
import {audio} from '../audio.js';
import {staffView} from './staff.js';
import {keyboard,fingerboard,spacingDiagram,playSeq,midiName} from './widgets.js';
import {SPACING_SETS} from '../content/lab.js';
import {actualNote,frenchName,midi,DURATIONS} from '../theory.js';
let filmMetadata;
const filmTimings=()=>filmMetadata??=fetch(new URL('../../video/manifest.json',import.meta.url)).then(r=>r.ok?r.json():null).catch(()=>null);
const B=(zh,fr)=>{register(zh,fr);return zh;};
export const studioForWorld=w=>STUDIOS.find(s=>s.world===w);
export function classroomIndex(){return h('div',{class:'page classroom-index'},
 h('header',{class:'page-head'},h('p',{class:'eyebrow'},'MINO’S MUSIC CINEMA'),h('h1',{},B('先看懂，再动手','Regarde, comprends, puis essaie')),h('p',{class:'muted'},B('每一课都从原创配音动画开始。先看教学，再互动、练习、复习和闯关。','Chaque cours commence par un film animé original : regarde, manipule, entraîne-toi, révise, puis relève un défi.'))),
 h('div',{class:'studio-grid'},...STUDIOS.map((s,i)=>h('a',{class:'studio-card',href:`#/learn/${s.id}`},h('span',{class:'studio-number'},`FILM ${String(i+1).padStart(2,'0')}`),h('img',{src:`video/${s.id}-zh.jpg`,alt:s.title[0],loading:'lazy',width:640,height:360}),h('h2',{},B(...s.title)),h('p',{},B(...s.subtitle)),h('span',{class:'btn primary small'},B('▶ 看动画课','▶ Regarder le cours'))))));}
export function classroomPage(id,store){
 const s=STUDIOS.find(x=>x.id===id);if(!s)return classroomIndex();
 s.steps.forEach(x=>{register(...x.title);register(x.zh,x.fr);});register(...s.title);register(...s.subtitle);
 const root=h('div',{class:'page classroom', 'data-studio':id});let phase=0,workspace=null;
 const seen=!!store.state.settings?.teachingWatched?.[id];let watched=seen;
 const phases=[['看动画课','Le film'],['动手探索','L’atelier'],['练习巩固','L’entraînement'],['间隔复习','Révision espacée'],['游戏考评','Défi des connaissances']];
 const phaseBar=h('ol',{class:'learning-pipeline'},...phases.map((x,i)=>h('li',{'data-phase':i},h('span',{},String(i+1)),h('strong',{},B(...x)))));
 const content=h('div',{class:'classroom-stage'});
 root.append(h('header',{class:'page-head'},h('a',{href:'#/learn',class:'back-link'},B('← 动画课堂','← Cinéma musical')),h('h1',{},s.icon+' '+B(...s.title)),h('p',{class:'muted'},B(...s.subtitle))),phaseBar,content);
 function updatePhase(n){phase=n;[...phaseBar.children].forEach((li,i)=>{li.classList.toggle('current',i===n);li.classList.toggle('done',i<n);});}
 function showFilm(){
  stopNarration();workspace?._cleanup?.();updatePhase(0);content.replaceChildren();
  let language=document.documentElement.dataset.language==='fr'?'fr':'zh';
  const caption=h('p',{class:'cinema-caption','aria-live':'polite'},B('先观看，不需要作答。看完后会解锁动手探索。','Regarde sans répondre. L’atelier se débloquera à la fin du film.'));
  const video=h('video',{class:'teaching-film',controls:true,playsinline:true,preload:'metadata',poster:`video/${id}-${language}.jpg`,'aria-label':B('配音动画教学视频','Film pédagogique animé et commenté')},h('source',{src:`video/${id}-${language}.mp4`,type:'video/mp4'}));
  const liveCaption=h('section',{class:'synchronized-caption','aria-label':'同步双语字幕 / Sous-titres bilingues synchronisés'});
  let timings=null,captionIndex=-1;
  const updateCaption=()=>{const records=timings?.videos?.find(v=>v.id===id&&v.lang===language)?.steps;const n=records?records.findIndex(x=>video.currentTime>=x.start&&video.currentTime<x.end):0;const index=n<0?s.steps.length-1:n;if(index===captionIndex)return;captionIndex=index;const c=FILMS.find(f=>f.id===id).steps[index];liveCaption.replaceChildren(h('h3',{},B(...c.title)),h('p',{},bilingual(c.zh,c.fr)));};
  filmTimings().then(data=>{timings=data;captionIndex=-1;if(root.isConnected)updateCaption();});
  video.addEventListener('timeupdate',updateCaption);updateCaption();
  const proceed=h('button',{class:'btn primary big',type:'button',disabled:!watched,onclick:()=>{video.pause();showWorkshop();}},B('看完了，去动手试试 →','J’ai regardé, passons à l’atelier →'));
  video.addEventListener('ended',()=>{watched=true;store.setSetting('teachingWatched',{...(store.state.settings.teachingWatched||{}),[id]:true});const reward=store.awardActivity(id,'film');proceed.disabled=false;setText(caption,B('动画课看完了！现在亲手试一试刚才的规律。','Film terminé ! À toi d’explorer la règle avec tes mains.'));sparkle(proceed);});
  const langs=h('div',{class:'cinema-languages',role:'group','aria-label':'视频语言 / Langue du film'},...['zh','fr'].map(lang=>h('button',{class:'btn ghost small',type:'button','aria-pressed':String(lang===language),onclick:e=>{
   if(lang===language)return;language=lang;video.pause();video.src=`video/${id}-${lang}.mp4`;video.poster=`video/${id}-${lang}.jpg`;video.load();captionIndex=-1;updateCaption();langs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===e.currentTarget)));
  }},lang==='zh'?'🎙 中文配音':'🎙 Voix française')));
  content.append(h('section',{class:'cinema-shell'},h('div',{class:'cinema-heading'},h('span',{class:'film-badge'},'01 · MINO CINEMA'),langs),video,liveCaption,caption,h('p',{class:'small muted'},B('原创教学动画 · 微软自然语音合成 · 可暂停、拖动、重看。','Animation pédagogique originale · voix naturelle de synthèse Microsoft · pause et retour possibles.')),proceed),
   h('details',{class:'film-transcript'},h('summary',{},B('展开双语讲解文字','Lire le texte bilingue')), ...FILMS.find(f=>f.id===id).steps.map(x=>h('section',{},h('h3',{},B(...x.title)),h('p',{},bilingual(x.zh,x.fr))))));
 }
 function showWorkshop(){
  let actions=new Set();const recordAction=e=>{const button=e.target.closest('button,svg [role=button]');if(button)actions.add(button.getAttribute('aria-label')||button.textContent);};
  updatePhase(1);content.replaceChildren();let step=0;
  const copy=h('section',{class:'coach-script'}),visual=h('section',{class:'workshop-visual'}),dots=h('div',{class:'coach-dots'});
  const instruction=h('p',{class:'atelier-note'},B('现在轮到你操作：这里可以反复试，不计分，也不会自动记录真实练琴。','À toi de manipuler : essaie librement, sans score et sans enregistrer une séance réelle de violon.'));
  const draw=()=>{
   workspace?._cleanup?.();const c=s.steps[step];copy.replaceChildren(h('p',{class:'eyebrow'},`ATELIER ${step+1}/${s.steps.length}`),h('h2',{},B(...c.title)),h('p',{},bilingual(c.zh,c.fr)),narration(c.zh,c.fr));
   workspace=makeWorkspace(s.kind,step);workspace.addEventListener('click',recordAction);workspace.addEventListener('pointerdown',recordAction);visual.replaceChildren(workspace);dots.replaceChildren(...s.steps.map((x,i)=>h('button',{class:'coach-dot',type:'button','aria-pressed':String(i===step),onclick:()=>{stopNarration();step=i;draw();}},String(i+1))));
  };
  const back=h('button',{class:'btn ghost',onclick:showFilm},B('↶ 重看动画课','↶ Revoir le film'));
  const next=h('button',{class:'btn primary',onclick:()=>{stopNarration();if(step<s.steps.length-1){step++;draw();}else {if(actions.size<2){copy.append(h('p',{class:'explore-status'},B('先在右边试至少两种操作，再进入练习。','Essaie au moins deux actions dans l’atelier avant de continuer.')));return;}store.awardActivity(id,'workshop');showPractice();}}},B('探索下一步 →','Explorer la suite →'));
  content.append(instruction,h('div',{class:'workshop-grid'},copy,visual),h('div',{class:'workshop-footer'},back,dots,next));draw();
 }
 function showPractice(){workspace?._cleanup?.();stopNarration();audio.stop?.();updatePhase(2);content.replaceChildren(h('section',{class:'practice-bridge'},h('span',{class:'big-symbol'},'✦'),h('h2',{},B('现在用自己的方法试一试','Maintenant, essaie sans aide')),h('p',{},B('你已经看过动画、亲手探索过规律。练习里先自己判断，答错后再看讲解。','Après le film et l’atelier, réponds seul. En cas d’erreur, relis l’explication avant de réessayer.')),h('div',{class:'q-actions'},h('a',{class:'btn primary big',href:`#/lesson/${s.practice}`},B('进入游戏练习 →','Commencer l’entraînement →')),h('a',{class:'btn ghost',href:'#/review'},B('🔁 间隔复习','🔁 Révision espacée')),h('a',{class:'btn ghost',href:'#/challenge'},B('🏆 综合闯关','🏆 Défi des connaissances')))));}
 root._cleanup=()=>{workspace?._cleanup?.();root.querySelector('video')?.pause();stopNarration();};
 showFilm();return root;
}
function makeWorkspace(kind,step){
 const root=h('div',{class:`teaching-workspace scene-${kind}`});const status=h('p',{class:'explore-status','aria-live':'polite'});let timers=[];
 const set=(zh,fr)=>setText(status,B(zh,fr));
 const play=async items=>{stopNarration();if(await audio.unlock()){audio.stop?.();playSeq(items,70);}};
 const button=(zh,fr,fn)=>h('button',{type:'button',class:'btn ghost small',onclick:fn},B(zh,fr));
 if(kind==='staff'){
  const notes=['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5'];let i=step===3?0:4;
  const box=h('div',{class:'elevator-score'}),name=h('div',{class:'note-name'});const draw=()=>{const n=notes[i];box.replaceChildren(staffView({keyCount:0,notes:[{step:n[0],octave:+n[1],dur:'w',measure:1}],highlight:[0]}));setText(name,frenchName(n,{withOctave:true}));set(i%2===0?'现在音符在线上':'现在音符在间里',i%2===0?'La note est sur une ligne.':'La note est dans un interligne.');};
  root.append(box,name,h('div',{class:'q-actions'},button('↓ 下一个台阶','↓ Descendre',()=>{i=Math.max(0,i-1);draw();play([notes[i]]);}),button('↑ 上一个台阶','↑ Monter',()=>{i=Math.min(notes.length-1,i+1);draw();play([notes[i]]);}),button('▶ 听这个音','▶ Écouter la note',()=>play([notes[i]]))));draw();
 }else if(kind==='chain'){
  let flat=step===2,n=0;const row=h('div',{class:'note-train'}),pool=h('div',{class:'train-pool'});
  const draw=()=>{const names=flat?['Si','Mi','La','Ré','Sol','Do','Fa']:['Fa','Do','Sol','Ré','La','Mi','Si'];row.replaceChildren(...names.map((x,i)=>h('span',{class:`train-car ${i<n?'arrived':''}`},i<n?x:'?')));pool.replaceChildren(...['Do','Ré','Mi','Fa','Sol','La','Si'].map(x=>h('button',{class:'chip',type:'button',disabled:names.slice(0,n).includes(x),onclick:e=>{if(names[n]===x){n++;draw();sparkle(row);}else{set('再看看下一节车厢的顺序，试错不计分。','Observe l’ordre du prochain wagon. Ici, les essais ne sont pas notés.');e.currentTarget.classList.add('wiggle');}}},x)));set(flat?'Si → Mi → La → Ré → Sol → Do → Fa':'Fa → Do → Sol → Ré → La → Mi → Si',flat?'Si → Mi → La → Ré → Sol → Do → Fa':'Fa → Do → Sol → Ré → La → Mi → Si');};
  root.append(row,pool,h('div',{class:'q-actions'},button('♯ 升号列车','♯ Train des dièses',()=>{flat=false;n=0;draw();}),button('♭ 降号列车','♭ Train des bémols',()=>{flat=true;n=0;draw();}),button('↶ 重新拼','↶ Recommencer',()=>{n=0;draw();})));draw();
 }else if(kind==='accidentals'){
  let natural=step>0,hi=step===2?3:0;const box=h('div'),legend=h('div',{class:'passport-notes'});
  const notes=()=>[{step:'F',octave:4,acc:natural?'n':null,dur:'q',measure:1},{step:'F',octave:4,dur:'q',measure:1},{step:'F',octave:5,dur:'h',measure:1},{step:'F',octave:4,dur:'w',measure:2}];
  const draw=()=>{const ns=notes();box.replaceChildren(staffView({keyCount:2,notes:ns,highlight:[hi]}));legend.replaceChildren(...ns.map((_,i)=>button(`${i+1} · ${frenchName(actualNote(ns,i,2),{withOctave:true})}`,`${i+1} · ${frenchName(actualNote(ns,i,2),{withOctave:true})}`,()=>{hi=i;draw();play([midi(actualNote(ns,i,2))]);})));set(hi===3?'跨过小节线，回到调号：Fa♯。':hi===2?'不同八度，不受前面还原号影响。':natural?'同小节、同八度：Fa 还原。':'没有临时记号，按调号：Fa♯。',hi===3?'Nouvelle mesure : retour au Fa dièse de l’armure.':hi===2?'Autre octave : le bécarre précédent ne s’applique pas.':natural?'Même mesure, même octave : Fa naturel.':'Sans altération accidentelle : Fa dièse selon l’armure.');};
  root.append(box,legend,h('div',{class:'q-actions'},button('♮ 放入／取走还原号','♮ Ajouter / enlever le bécarre',()=>{natural=!natural;draw();}),button('→ 跨过小节线','→ Passer la barre de mesure',()=>{hi=3;draw();play([midi(actualNote(notes(),3,2))]);})));draw();
 }else if(kind==='steps'){
  let current=step===0?64:60,idx=0;const route=[62,64,66,67,69,71,73,74];const badge=h('div',{class:'interval-display'});const kb=keyboard({onKey:m=>{const d=Math.abs(m-current);set(`${midiName(current)} → ${midiName(m)}：${d} 个半音`,`${midiName(current)} → ${midiName(m)} : ${d} demi-ton(s)`);current=m;setText(badge,midiName(m));}});
  const advance=d=>{const old=current;current=Math.min(76,current+d);kb.clear('hl');kb.mark(current,'hl');setText(badge,midiName(current));play([old,current]);set(d===1?'走 1 个半音':'走 2 个半音＝1 个全音',d===1?'Un demi-ton':'Deux demi-tons = un ton');};
  root.append(badge,kb,h('div',{class:'q-actions'},button('+1 半音','+1 demi-ton',()=>advance(1)),button('+2 半音','+1 ton',()=>advance(2)),button('Ré 大调下一步','Ré majeur : note suivante',()=>{const old=current;current=route[idx++%8];kb.clear('hl');kb.mark(current,'hl');setText(badge,midiName(current));play([old,current]);set('Ré – Mi – Fa♯ – Sol – La – Si – Do♯ – Ré','Ré – Mi – Fa♯ – Sol – La – Si – Do♯ – Ré');}),button('↶ 回到 Do','↶ Repartir de Do',()=>{current=60;idx=0;kb.clear('hl');setText(badge,'Do3');})));setText(badge,midiName(current));
 }else if(kind==='rhythm'){
  let durs=step===0?['q','q','q','q']:step===1?['h','h']:step===2?['8','8','q','h']:[];
  const track=h('div',{class:'beat-train-track'}),count=h('p',{class:'measure-count'});let playing=false;
  const draw=()=>{const sum=durs.reduce((a,d)=>a+DURATIONS[d].beats,0);setText(count,B(`已装 ${sum} / 4 拍`,`Mesure : ${sum} / 4 temps`));track.replaceChildren(...durs.map((d,i)=>h('button',{type:'button',class:'duration-wagon',style:{flex:DURATIONS[d].beats},onclick:()=>{if(!playing){durs.splice(i,1);draw();}}},durationGlyph(d),h('small',{},DURATIONS[d].fr),h('span',{},String(DURATIONS[d].beats)))));if(sum<4)track.append(h('span',{class:'empty-wagon',style:{flex:4-sum}},`${4-sum}`));};
  root.append(h('div',{class:'beat-stations'},...['1','2','3','4'].map(x=>h('span',{},x))),track,count,h('div',{class:'q-actions'},...['q','h','8'].map(d=>button(`+ ${DURATIONS[d].fr}`,`+ ${DURATIONS[d].fr}`,()=>{if(playing)return;const n=durs.reduce((a,d)=>a+DURATIONS[d].beats,0)+DURATIONS[d].beats;if(n<=4){durs.push(d);draw();}else set('已经超过四拍，先拿回一个音符。','Cela dépasse quatre temps. Retire d’abord une note.');})),button('清空小节','Vider la mesure',()=>{if(!playing){durs=[];draw();}}),button('▶ 看火车，听节奏','▶ Voir et écouter le rythme',async()=>{if(playing||!durs.length)return;stopNarration();if(!await audio.unlock())return;audio.stop?.();playing=true;root.classList.add('train-running');const dur=audio.sequence(durs.map(d=>({midi:71,beats:DURATIONS[d].beats})),{bpm:60,onNote:i=>[...track.children].forEach((c,j)=>c.classList.toggle('playing',i===j))});timers.push(setTimeout(()=>{playing=false;root.classList.remove('train-running');[...track.children].forEach(c=>c.classList.remove('playing'));},dur*1000+200));})));draw();
 }else if(kind==='violin'){
  let third=step===1,high=false;const holder=h('div');const draw=()=>{const board=fingerboard({pos:step===0?'open':third?'third':'first',reveal:step===1?{string:'A',semis:5}:null});holder.replaceChildren(board);if(step===2)holder.append(spacingDiagram(SPACING_SETS.find(s=>s.id===(high?'spacing.A1.D':'spacing.A1.C'))));set(step===0?'四根空弦：Sol2 · Ré3 · La3 · Mi4':third?'同一个 Ré4：第三把位 1 指':'同一个 Ré4：第一把位 3 指',step===0?'Cordes à vide : Sol2 · Ré3 · La3 · Mi4':third?'Même Ré4 : 1er doigt en 3e position':'Même Ré4 : 3e doigt en 1re position');};
  root.append(holder,h('div',{class:'q-actions'},button('切换第一／第三把位','Changer de position',()=>{third=!third;draw();play(['D5']);}),button('低二指／高二指','2e doigt bas / haut',()=>{high=!high;draw();play(high?['B4','C#5','D5']:['B4','C5','D5']);})));draw();
 }else if(kind==='ear'){
  let choice=0,shown=false;const pairs=[['D4','A4'],['A4','D4'],['E4','E4'],['E4','F4'],['F4','G4']];const curve=h('div',{class:'ear-trajectory'});const draw=()=>{curve.className='ear-trajectory '+(shown?['up','down','same','up','up'][choice]:'hidden');curve.replaceChildren(h('span',{class:'sound-orb'},'♪'),h('span',{class:'ear-cover'},shown?'':B('先听，再揭开','Écoute avant de révéler')));};
  root.append(curve,h('div',{class:'q-actions'},button('▶ 先听声音','▶ Écouter d’abord',()=>{shown=false;draw();play(pairs[choice]);}),button('揭开／藏起轨迹','Révéler / cacher le trajet',()=>{shown=!shown;draw();}),button('换一组声音','Changer de sons',()=>{choice=(choice+1)%pairs.length;shown=false;draw();play(pairs[choice]);})));draw();
 }else{
  let opened=0;const cards=h('div',{class:'detective-cards'});const labels=[['看调号','Armure'],['认音名','Notes'],['看升降','Altérations'],['弦·把位·手指','Corde et doigté'],['读节奏','Rythme']];const draw=()=>cards.replaceChildren(...labels.map((x,i)=>h('button',{type:'button',class:`clue-card ${i<=opened?'revealed':''}`,onclick:()=>{if(i<=opened+1){opened=Math.max(opened,i);draw();set(...x);sparkle(cards);}else set('先打开前一张线索卡。','Ouvre d’abord l’indice précédent.');}},h('span',{},String(i+1)),h('strong',{},i<=opened?B(...x):'?'))));root.append(cards,button('重新调查','Nouvelle enquête',()=>{opened=0;draw();}));draw();
 }
 root.append(status);root._cleanup=()=>timers.forEach(clearTimeout);return root;
}

function durationGlyph(d){
 const svg=svgEl('svg',{viewBox:'0 0 45 75',width:34,height:55,'aria-hidden':'true'});
 svg.append(svgEl('ellipse',{cx:17,cy:58,rx:11,ry:7,fill:d==='h'?'none':'#fff',stroke:'#fff','stroke-width':3,transform:'rotate(-15 17 58)'}));
 svg.append(svgEl('line',{x1:27,y1:57,x2:27,y2:12,stroke:'#fff','stroke-width':3}));
 if(d==='8')svg.append(svgEl('path',{d:'M27 12 Q48 24 29 39',fill:'none',stroke:'#fff','stroke-width':4}));return svg;
}
