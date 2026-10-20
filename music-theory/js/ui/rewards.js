import {h,svgEl} from './dom.js';
import {register} from '../i18n.js';
import {STUDIOS} from '../teaching-content.js';
import {levelFromXp} from '../store.js';
import {mino} from './widgets.js';
import {journey} from '../progression.js';

const ICONS={spark:'m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z',explore:'m12 3 9 9-9 9-9-9zm0 5 4 4-4 4-4-4z',streak:'M13 3c1 5-3 5-2 9 1-2 3-2 4-4 4 4 5 7 2 11-3 3-9 2-11-1-3-5 2-8 3-11 0 3 2 3 2 5',collection:'M5 4h14v16H5zm0 5h14M9 9v11m5-7v4m-2-2h4',film:'m9 7 8 5-8 5z'};
function lineIcon(name){const svg=svgEl('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'});svg.append(svgEl('path',{d:ICONS[name]||ICONS.spark}));return svg;}

const B=(z,f)=>{register(z,f);return z;};
export function learningDashboard(store){
 const st=store.state,watched=st.settings.teachingWatched||{},rewards=st.settings.activityRewards||{},day=st.days[store.today()]||{};
 const next=journey(st).next;const course=STUDIOS.find(s=>s.id===next?.course)||STUDIOS.find(s=>s.world===next?.world)||STUDIOS[0];
 const nextHref=next?.href||'#/review';
 const goal=Number(st.settings.dailyGoal)||40,earned=day.xp||0,ratio=Math.min(1,earned/goal),lv=levelFromXp(st.xp);
 const films=Object.values(watched).filter(Boolean).length,workshops=Object.keys(rewards).filter(k=>k.endsWith(':workshop')).length;
 const badges=[['spark','第一堂动画课','Premier film',films>=1],['explore','探索小能手','Explorateur',workshops>=3],['streak','三日同行','Trois jours de suite',store.streak()>=3],['collection','八课收藏家','Huit films découverts',films>=8]];
 const target=h('div',{class:'daily-xp'},h('span',{class:'goal-ring',style:{'--goal':`${ratio*100}%`}},h('strong',{},`${Math.round(ratio*100)}%`)),h('div',{},h('h3',{},B('今日小目标','Ton objectif du jour')),h('p',{},`${earned} / ${goal} XP`),h('label',{class:'small'},h('span',{class:'sr-only'},B('选择目标','Choisir l’objectif')),h('select',{'aria-label':'每日XP目标 / Objectif XP',onchange:e=>{store.setSetting('dailyGoal',Number(e.target.value));target.replaceWith(learningDashboard(store).querySelector('.daily-xp'));}},...[20,40,60].map(n=>h('option',{value:n,selected:n===goal},`${n} XP`))))));
 return h('section',{class:'teaching-dashboard'},
  h('div',{class:'cinema-hero'},
   h('div',{class:'hero-copy'},h('p',{class:'eyebrow'},h('span',{class:'live-dot','aria-hidden':'true'}),'THE MUSIC DISCOVERY LAB'),
    h('h2',{},B('听见规律，玩懂音乐','Écoute. Explore. Joue.')),
    h('p',{class:'hero-description'},B('从一段会讲故事的动画开始，把音乐的小秘密，变成自己的本领。','Un film pour découvrir, un atelier pour essayer. Et la musique devient ton terrain de jeu.')),
    h('div',{class:'hero-journey','aria-label':'学习路径 / Ton parcours'},h('span',{},B('看动画','Regarder')),h('i',{'aria-hidden':'true'},'→'),h('span',{},B('动手探索','Explorer')),h('i',{'aria-hidden':'true'},'→'),h('span',{},B('游戏闯关','Jouer'))),
    h('a',{class:'btn primary big',href:nextHref},h('span',{class:'button-play','aria-hidden':'true'},'▶'),B(next?.kind==='film'?'开始我的动画课':'继续我的冒险',next?.kind==='film'?'Commencer mon film':'Continuer mon aventure'),h('span',{class:'button-arrow','aria-hidden':'true'},'↗')),
    h('a',{class:'text-link',href:'#/learn'},B('浏览全部 8 堂动画课','Découvrir les 8 films'),h('span',{'aria-hidden':'true'},' →'))),
   h('div',{class:'hero-visual','aria-label':'推荐课堂 / Le film conseillé'},h('div',{class:'music-orbit orbit-one','aria-hidden':'true'}),h('div',{class:'music-orbit orbit-two','aria-hidden':'true'}),h('span',{class:'floating-note note-a','aria-hidden':'true'},'♪'),h('span',{class:'floating-note note-b','aria-hidden':'true'},'♬'),
    h('div',{class:'hero-companion','aria-hidden':'true'},mino('happy',88)),
    h('a',{class:'hero-film',href:nextHref},h('img',{src:`video/${course.id}-zh.jpg`,alt:course.title[0],width:640,height:360,decoding:'async',fetchpriority:'high'}),h('span',{class:'play-orb','aria-hidden':'true'},'▶'),h('span',{class:'film-label'},h('small',{},'NEXT UP · '+B('推荐给你','Pour toi')),h('strong',{},B(...course.title)))),
    h('div',{class:'visual-caption'},h('span',{class:'caption-dot','aria-hidden':'true'}),B('中法双语 · 原创配音动画','Chinois & français · films originaux')))),
  h('div',{class:'quest-strip'},target,h('div',{class:'quest-count'},h('span',{class:'metric-icon','aria-hidden':'true'},lineIcon('streak')),h('div',{},h('strong',{},`${store.streak()}`),h('span',{},B('连学天数','Jours de suite')))),h('div',{class:'quest-count'},h('span',{class:'metric-icon level-icon','aria-hidden':'true'},lineIcon('spark')),h('div',{},h('strong',{},`Lv.${lv.level}`),h('span',{},`${st.xp} XP`))),h('div',{class:'quest-count'},h('span',{class:'metric-icon film-icon','aria-hidden':'true'},lineIcon('film')),h('div',{},h('strong',{},`${films}/8`),h('span',{},B('看过的动画课','Films regardés'))))),
  h('div',{class:'section-heading'},h('div',{},h('p',{class:'eyebrow'},'LITTLE WINS, BIG ADVENTURES'),h('h2',{},B('每一步，都值得收藏','Chaque pas mérite son étoile'))),h('span',{class:'collection-count'},`${badges.filter(x=>x[3]).length} / 4`)),
  h('div',{class:'badge-shelf'},...badges.map(([icon,zh,fr,done])=>h('div',{class:`achievement ${done?'earned':'locked'}`,'aria-label':B(`${zh}：${done?'已获得':'待解锁'}`,`${fr} : ${done?'obtenu':'à débloquer'}`)},h('span',{class:'achievement-medal','aria-hidden':'true'},lineIcon(icon)),h('div',{class:'achievement-copy'},h('strong',{},B(zh,fr)),h('small',{},B(done?'已获得':zh==='探索小能手'?'完成 3 次探索':zh==='三日同行'?'连续学习 3 天':zh==='八课收藏家'?'看完 8 堂动画课':'看完首堂动画课',done?'Obtenu':zh==='探索小能手'?'3 ateliers':zh==='三日同行'?'3 jours de suite':zh==='八课收藏家'?'8 films':'Ton premier film'))),h('span',{class:'badge-state','aria-hidden':'true'},done?'✓':'·')))),
  h('p',{class:'small muted reward-boundary'},B('动画首次看完 +10 XP · 探索首次完成 +5 XP。观看不等于掌握，XP 不兑换原站奖金。','Premier film +10 XP · premier atelier +5 XP. Regarder ne prouve pas la maîtrise. Les XP ne sont pas convertis en argent.')));
}
