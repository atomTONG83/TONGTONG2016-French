// A read-only projection of real saved activity. Opening a map never awards XP.
import {WORLDS,LESSONS,getQuestion,bank} from './content/index.js';
import {STUDIOS} from './teaching-content.js';
export const GUARDIANS=[['谱线迷雾','Brume de la portée'],['记号迷雾','Brume des altérations'],['节拍迷雾','Brume du rythme'],['指板迷雾','Brume de la touche'],['听觉迷雾','Brume des sons'],['读谱迷雾','Brume du déchiffrage']];
export function lessonPassed(record){return !!record&&record.completed>0&&Number.isFinite(record.bestAcc)&&record.bestAcc>=.6&&record.bestAcc<=1;}
export function lessonStars(record){return lessonPassed(record)?record.bestAcc>=1?3:record.bestAcc>=.8?2:1:0;}
export function chapterProgress(state,world){
 const w=WORLDS.find(x=>x.id===world);if(!w)return null;
 const courses=STUDIOS.filter(s=>s.world===world),levels=LESSONS.filter(l=>l.world===world);
 const tasks=courses.flatMap(s=>[
  {id:'film:'+s.id,kind:'film',course:s.id,world,title:s.title,href:`#/learn/${s.id}`,done:state.settings?.teachingWatched?.[s.id]===true},
  {id:'workshop:'+s.id,kind:'workshop',course:s.id,world,title:s.title,href:`#/learn/${s.id}/workshop`,done:!!state.settings?.activityRewards?.[s.id+':workshop']}
 ]).concat(levels.map(l=>({id:l.id,kind:'lesson',world,title:[l.title,l.title],href:`#/lesson/${l.id}`,done:lessonPassed(state.lessons?.[l.id]),stars:lessonStars(state.lessons?.[l.id])})));
 const ready=tasks.every(x=>x.done),record=state.settings?.campaignGuardians?.[world];
 const guardian={id:'guardian:'+world,kind:'guardian',world,title:GUARDIANS[WORLDS.indexOf(w)],href:`#/guardian/${world}`,ready,done:!!record?.clearedAt&&Number.isFinite(record.bestAcc)&&record.bestAcc>=.6&&record.bestAcc<=1};
 tasks.push(guardian);
 return {...w,courses,levels,tasks,guardian,done:tasks.filter(x=>x.done).length,total:tasks.length,cleared:guardian.done};
}
export function journey(state){
 const chapters=WORLDS.map(w=>chapterProgress(state,w.id)),tasks=chapters.flatMap(c=>c.tasks),done=tasks.filter(t=>t.done).length;
 const next=tasks.find(t=>!t.done)||null;
 return {chapters,tasks,done,total:tasks.length,percent:Math.round(done/tasks.length*100),next,currentWorld:next?.world||WORLDS.at(-1).id,cleared:chapters.filter(c=>c.cleared).length,passedLessons:tasks.filter(t=>t.kind==='lesson'&&t.done).length,stars:tasks.reduce((n,t)=>n+(t.stars||0),0),complete:!next};
}
export function guardianQuestions(world,attempt=0){
 const levels=LESSONS.filter(l=>l.world===world);const pool=levels.map(l=>(l.pool?l.pool().map(getQuestion):[...bank().values()].filter(q=>q.id.startsWith(l.detective+'.'))).filter(q=>q&&['choice','multi','order'].includes(q.type)&&!q.noHints));
 const picked=[],seen=new Set();for(let round=0;round<200&&picked.length<5;round++)for(const list of pool){const q=list[(round+(Number.isSafeInteger(attempt)&&attempt>0?attempt:0))%list.length];if(q&&!seen.has(q.id)){picked.push(q);seen.add(q.id);}if(picked.length===5)break;}
 return picked;
}
