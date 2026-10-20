import {FILMS} from '../music-theory/js/teaching-films.js';
import {STUDIOS} from '../music-theory/js/teaching-content.js';
import {LESSONS} from '../music-theory/js/content/index.js';
import {installFrench} from '../music-theory/js/content/french.js';
import {french} from '../music-theory/js/i18n.js';
import {voiceKey} from '../music-theory/js/voice.js';
installFrench();
const clips=new Map();
function add(lang,text){const key=voiceKey(lang,text);if(clips.has(key)&&clips.get(key).text!==text)throw Error('Voice key collision');clips.set(key,{key,lang,text});return key;}
const studios=FILMS.map(s=>({...s,steps:s.steps.map(x=>({...x,voice:{zh:add('zh',x.zh),fr:add('fr',x.fr)}}))}));
for(const s of STUDIOS)for(const c of s.steps){add('zh',c.zh);add('fr',c.fr);}
for(const l of LESSONS)for(const c of l.intro||[]){add('zh',c.text);add('fr',french(c.text));}
console.log(JSON.stringify({studios,clips:[...clips.values()]},null,2));
