// Authored French teaching layer. IDs, answer values and scoring stay unchanged.
import {bank, LESSONS, WORLDS, SKILLS} from './index.js';
import {TEACHER_WEEKS, REPERTOIRE} from './tasks.js';
import {EXCERPTS, buildDetective} from './castle.js';
import {FR_NAME, frenchName, actualNote, keySignatureSteps, DURATIONS, midi} from '../theory.js';
import {STRINGS, POSITIONS, placements, stringById} from '../violin.js';
import {register, french} from '../i18n.js';
const nm=n=>frenchName(n,{withOctave:true});
const pos=p=>p==='third'?'troisième position':'première position';
const seq=x=>Array.isArray(x)?x.join(' – '):String(x);
const alterations='Un dièse monte d’un demi-ton ; un bémol descend d’un demi-ton ; un bécarre annule une altération. Dans une mesure, l’altération accidentelle concerne seulement la même note à la même octave. Après la barre de mesure, l’armure s’applique à nouveau.';
function option(q,o){
 const s=o.label;
 if(!/[\u3400-\u9fff]/u.test(s))return s;
 const exact={
 'clé de sol（高音谱号），第二线是 Sol':'Clé de sol : la deuxième ligne est Sol',
 'clé de fa（低音谱号），第二线是 Fa':'Clé de fa : la deuxième ligne est Fa',
 'clé de sol，第二线是 Do':'Clé de sol : la deuxième ligne est Do',
 '先认出音符（这里是 Do4），再用指法数字确认手指':'Identifier la note (ici Do4), puis lire le doigté',
 '直接按 2 指，不用认音符':'Poser le 2e doigt sans lire la note', '等老师示范再说':'Attendre que le professeur montre',
 '一个都不用，全部按白键音（本位音）':'Aucune : toutes les notes sont naturelles', '只有 Fa 要升':'Seulement Fa dièse', '只有 Si 要降':'Seulement Si bémol',
 '半音 · demi-ton':'Un demi-ton','全音 · ton':'Un ton','半音 · demi-ton（很近）':'Un demi-ton : très proche','全音 · ton（远一点）':'Un ton : plus large',
 '⬆ 更高':'⬆ Plus aigu','⬇ 更低':'⬇ Plus grave','＝ 一样高':'＝ Même hauteur',
 '不能：要先认音符，再结合琴弦和把位':'Non : il faut aussi la note, la corde et la position',
 '能：2 指永远是同一个音':'Oui : le 2e doigt donne toujours la même note','能：2 指一定是 Mi':'Oui : le 2e doigt est toujours Mi',
 '第一把位 3 指，第三把位 1 指':'3e doigt en 1re position ; 1er doigt en 3e position',
 '两种把位都是 3 指':'3e doigt dans les deux positions','第一把位 1 指，第三把位 3 指':'1er doigt en 1re position ; 3e doigt en 3e position',
 '空弦 0':'Corde à vide · 0','半拍':'Un demi-temps',
 '看调号':'Observer l’armure','认音名':'Nommer les notes','加上升降/还原':'Appliquer les altérations',
 '确定琴弦·把位·指法':'Trouver corde, position et doigté','看节奏':'Lire le rythme',
 '看调号和拍号':'Observer l’armure et le chiffrage','把音名、节奏都读一遍':'Lire les notes et le rythme',
 '摆好姿势、深呼吸':'Se placer et respirer','心里数一小节再开始':'Compter une mesure avant de commencer',
 };
 if(exact[s])return exact[s];
 if(/^[0-4] 指$/.test(s))return `${s[0]}e doigt`;
 if(/^[1-4]–[1-4] 指$/.test(s))return `Doigts ${s.slice(0,3)}`;
 if(/^\d 拍$/.test(s))return `${s[0]} temps`;
 const st=STRINGS.find(x=>x.zh===s);if(st)return `Corde de ${st.fr}`;
 if(/^(.+) 弦 (空弦|\d 指)$/.test(s)){const m=s.match(/^(.+) 弦 (空弦|\d 指)$/);return `Corde de ${m[1]} · ${m[2]==='空弦'?'à vide':m[2][0]+'e doigt'}`;}
 if(/majeur（/.test(s))return s.split('（')[0];
 if(/^(ronde|blanche|noire|croche)（/.test(s))return s.split('（')[0];
 if(/（bécarre \/ 本位）/.test(s))return s.replace('（bécarre / 本位）',' (bécarre)');
 if(/（(?:dièse|bémol)/.test(s))return s.replaceAll('（',' (').replaceAll('）',')');
 throw Error(`Missing French option ${q.id}: ${s}`);
}
function accidentalExplanation(q){
 const hi=q.staff.highlight?.[0]??0;const a=actualNote(q.staff.notes,hi,q.staff.keyCount??0);
 return `La note jouée est ${nm(a)}. ${alterations}`;
}
export function questionFrench(q){
 const id=q.id;const parts=id.split('.');let prompt,explain;
 if(id==='read.clef'){prompt='Comment s’appelle cette clé ? Quelle note indique sa boucle sur la deuxième ligne ?';explain='La clé de sol indique Sol3 sur la deuxième ligne. Depuis ce repère, compte les noms de notes en montant ou en descendant. La clé de fa indique Fa sur la quatrième ligne.';}
 else if(id.startsWith('read.note.')){prompt='Comment s’appelle cette note ?';explain=`C’est ${nm(parts[2])}. Lignes, de bas en haut : Mi, Sol, Si, Ré, Fa. Interlignes : Fa, La, Do, Mi. Chaque passage d’une ligne à un interligne avance d’un nom de note.`;}
 else if(id==='read.lines'){prompt='Range les notes des cinq lignes de bas en haut.';explain='Mi3, Sol3, Si3, Ré4, Fa4. Entre deux lignes se trouve un interligne et un autre nom de note.';}
 else if(id==='read.spaces'){prompt='Range les notes des quatre interlignes de bas en haut.';explain='Fa3, La3, Do4, Mi4.';}
 else if(id==='read.finger.first'){prompt='Le chiffre 2 est écrit au-dessus de cette note. Que dois-tu lire en premier ?';explain='Lis d’abord Do4, puis le doigté. Sur la corde de La en première position, Do4 est un deuxième doigt bas ; Do dièse4 est un deuxième doigt haut. Le chiffre seul ne donne pas la hauteur.';}
 else if(id.startsWith('order.')){const sharp=id.endsWith('sharps');prompt=`Range les sept ${sharp?'dièses':'bémols'} dans l’ordre de leur apparition à l’armure.`;explain=sharp?'Fa – Do – Sol – Ré – La – Mi – Si. Pour trouver le suivant, compte cinq noms en incluant le nom de départ.':'Si – Mi – La – Ré – Sol – Do – Fa. C’est l’ordre inverse des dièses.';}
 else if(/^(sharps|flats)\./.test(id)){const sharp=parts[0]==='sharps',n=+parts[2],order=sharp?['Fa','Do','Sol','Ré','La','Mi','Si']:['Si','Mi','La','Ré','Sol','Do','Fa'];prompt=parts[1]==='index'?`Quel est le ${n}e ${sharp?'dièse':'bémol'} dans l’ordre de l’armure ?`:`L’armure contient déjà ${order.slice(0,n).map(x=>x+(sharp?'♯':'♭')).join(', ')}. Quel est le prochain ${sharp?'dièse':'bémol'} ?`;explain=`L’ordre est ${order.join(' – ')}. Ici, la réponse est ${q.answer}. On ajoute les altérations dans cet ordre, sans en sauter.`;}
 else if(id.startsWith('ks.')){const k=q.staff.keyCount,sharp=k>0;const altered=keySignatureSteps(k).map(x=>FR_NAME[x]+(sharp?'♯':'♭')).join(', ');prompt=parts[1]==='notes'?(k===0?'Aucune altération n’est écrite à l’armure. Quelles notes faut-il modifier ?':`Quelles notes cette armure ${sharp?'monte':'descend'}-t-elle d’un demi-ton ? Plusieurs réponses sont possibles.`):parts[1]==='last'?`Quel est le dernier ${sharp?'dièse':'bémol'}, à droite de l’armure ?`:'À quelle tonalité majeure correspond cette armure ?';explain=k===0?'Sans armure, les notes sont naturelles, sauf altération accidentelle.':parts[1]==='key'?`Cette armure correspond à ${q.answer}. ${sharp?'Le dernier dièse se trouve un demi-ton sous la tonique.':k===-1?'Avec un seul bémol, retiens Fa majeur.':'Avec plusieurs bémols, l’avant-dernier donne la tonique.'}`:`L’armure contient ${altered}. Elle s’applique à ces notes dans toutes les octaves, sauf indication contraire.`;}
 else if(id.startsWith('acc.')){prompt=`Quelle est la hauteur réelle de la note lumineuse dans la mesure ${q.staff.notes[q.staff.highlight[0]].measure} ?`;explain=accidentalExplanation(q);}
 else if(id.startsWith('dur.')){const d=parts[2];prompt=parts[1]==='name'?'Comment s’appelle cette figure de note ?':parts[1]==='beats'?`En 4/4, combien de temps dure une ${DURATIONS[d].fr} ?`:parts[1]==='fill'?`Une mesure à 4/4 contient déjà ${q.prompt.match(/：(.+)。/)?.[1]}. Combien de temps manque-t-il ?`:'Deux croches ont la même durée que quelle figure ?';explain=parts[1]==='fill'?`Il manque ${q.answer} temps pour arriver à quatre temps. Compte toutes les durées et tiens les notes jusqu’au bout.`:'Si la noire vaut un temps, la ronde vaut quatre temps, la blanche deux temps et la croche un demi-temps. Deux croches font une noire.';}
 else if(id==='rhythm.before-play'){prompt='Avant de jouer un morceau, range ces actions dans l’ordre.';explain='Observe l’armure et le chiffrage, lis les notes et le rythme, place-toi et respire, puis compte une mesure pour entrer sans précipitation.';}
 else if(id.startsWith('tap.')){prompt=`Frappe ce rythme avec le métronome : ${q.pattern.durs.map(d=>DURATIONS[d].fr).join(' – ')}.`;explain='Frappe seulement au début de chaque note. Une blanche demande une frappe, puis deux temps de tenue.';}
 else if(id.startsWith('step.kind.')){const [a,b]=parts[2].split('-');prompt=`${frenchName(a)} → ${frenchName(b)} : un ton ou un demi-ton ?`;explain=`Cet intervalle est un ${q.answer}. Deux touches voisines, noires comprises, forment un demi-ton ; un ton contient deux demi-tons. Sur une même corde, deux doigts voisins se rapprochent pour un demi-ton.`;}
 else if(id==='scale.build.D'){prompt='Sur le clavier, construis les huit notes de Ré majeur en partant de Ré.';explain='Ré – Mi – Fa dièse – Sol – La – Si – Do dièse – Ré. Le schéma est ton, ton, demi-ton, ton, ton, ton, demi-ton.';}
 else if(id.startsWith('scale.half.')){prompt=`Dans la gamme ${q.prompt.split(' 音阶 ')[0]}, quelles paires de notes sont séparées par un demi-ton ?`;explain=`Les demi-tons d’une gamme majeure sont entre les degrés 3–4 et 7–8 : ${q.options.filter(o=>q.answer.includes(o.value)).map(o=>o.label).join(' ; ')}.`;}
 else if(id.startsWith('spacing.')){const s=q.spacing;prompt=`Sur la corde de ${stringById(s.string).fr}, en ${pos(s.pos)}, joue ${s.notes.map(n=>frenchName(n)).join(' – ')} avec les doigts 1, 2, 3 et 4. Quels doigts se rapprochent ?`;explain=`Les doigts ${q.answer.join(' et ')} sont séparés par un demi-ton. Les doigts voisins séparés par un ton sont plus écartés. Cela dépend des notes, de la corde, de la tonalité et de la position.`;}
 else if(id.startsWith('open.')){prompt=parts[1]==='order'?'Range les quatre cordes à vide de la plus grave à la plus aiguë.':parts[1]==='ear'?'Écoute : quelle corde à vide entends-tu ? Tu peux réécouter.':'À quelle corde à vide correspond cette note ?';explain=parts[1]==='order'?'Sol2 – Ré3 – La3 – Mi4. Chaque corde voisine est à une quinte juste.':`C’est la corde de ${stringById(q.answer).fr}, ${nm(stringById(q.answer).open)}. Les cordes à vide sont Sol2, Ré3, La3 et Mi4.`;}
 else if(/^(p1|p3)\.finger\./.test(id)){const p=parts[0]==='p3'?'third':'first',sid=parts[2],note=parts[3],pl=placements(note,p).find(x=>x.string===sid);prompt=`Sur la corde de ${stringById(sid).fr}, en ${pos(p)}, quel doigt joue ${nm(note)} ?`;explain=`${nm(note)} est à ${pl.semis} demi-tons au-dessus de la corde à vide : utilise le doigt ${q.answer} en ${pos(p)}. Lis toujours la note, la corde et la position ensemble.`;}
 else if(id.startsWith('p1.where.')){prompt=`En première position, où peux-tu jouer ${nm(parts[2])} ? Plusieurs réponses sont possibles.`;explain=`Les possibilités sont : ${q.options.filter(o=>q.answer.includes(o.value)).map(o=>option(q,o)).join(' ; ')}. Le quatrième doigt d’une corde et la corde à vide juste au-dessus donnent la même hauteur.`;}
 else if(id.startsWith('p3.first.')){prompt=`En troisième position, quelle note joue le premier doigt sur la corde de ${stringById(parts[2]).fr} ?`;explain=`Le premier doigt joue ${q.answer}. Depuis la corde à vide, compte quatre noms en incluant la note de départ : c’est la place du troisième doigt en première position.`;}
 else if(id==='finger.ambiguous'){prompt='Un chiffre 2 est écrit au-dessus d’une note. Ce chiffre suffit-il à connaître son nom ?';explain='Non. Le chiffre indique le doigt, pas le nom de la note. Lis la note et ses altérations, puis la corde et la position.';}
 else if(id==='finger.samenote'){prompt='Pour jouer Ré4 sur la corde de La : quel doigt en première position, puis en troisième position ?';explain='Ré4 se joue avec le troisième doigt en première position et le premier doigt en troisième position. La main se déplace mais la hauteur reste la même.';}
 else if(id==='reading.order'){prompt='Tu découvres une partition. Range les étapes de déchiffrage.';explain='Observe l’armure, nomme les notes, applique les altérations, trouve corde, position et doigté, puis lis le rythme avant de jouer.';}
 else if(id.startsWith('ear.')){prompt=parts[1]==='dir'?'Écoute les deux notes : la deuxième est-elle plus aiguë, plus grave ou à la même hauteur ?':parts[1]==='step'?'Écoute ces notes voisines : un demi-ton ou un ton ?':'Écoute la mélodie. Quelle portée correspond à ce que tu entends ?';explain=parts[1]==='dir'?`La deuxième note est ${q.answer==='higher'?'plus aiguë':q.answer==='lower'?'plus grave':'à la même hauteur'}. Réécoute en imaginant le mouvement des notes.`:parts[1]==='step'?`Tu entends un ${q.answer}. Un demi-ton est l’intervalle le plus petit entre deux touches voisines ; un ton en contient deux.`:`Tu entends ${q.autoplay.map(n=>frenchName(n)).join(' – ')}. Suis la portée du doigt : quand le son monte, les notes montent aussi.`;}
 else if(id.startsWith('det.')){const ex=EXCERPTS.find(x=>id.startsWith(x.id+'.'));const kind=parts[2],i=+parts[3];
 prompt=kind==='key'?'Quelles notes sont modifiées par cette armure ? Plusieurs réponses sont possibles.':kind==='name'?`Comment s’appelle la note n° ${i+1} ? Ignore pour l’instant les altérations.`:kind==='pitch'?`Quelle hauteur réelle faut-il jouer pour la note n° ${i+1} ?`:kind==='string'?`La note n° ${i+1} est ${nm(actualNote(ex.notes,i,ex.keyCount))}, jouée avec le doigt ${ex.notes[i].finger} en ${pos(ex.position)}. Sur quelle corde ?`:kind==='rhythm'?'Quel est le rythme de la première mesure ?':`Note n° ${i+1} :`;
 explain=kind==='key'?`L’armure modifie ${q.answer.join(', ')} dans toutes les octaves, sauf altération accidentelle.`:kind==='pitch'?accidentalExplanation(q):kind==='name'?`Le nom est ${q.answer}. Lis les lignes et les interlignes avant d’appliquer les altérations.`:kind==='string'?`Cette note se joue sur la corde de ${stringById(q.answer).fr}, en ${pos(ex.position)}, avec le doigt ${ex.notes[i].finger}. Un même doigt sur une autre corde donne une autre note.`:kind==='rhythm'?`La mesure contient ${q.answer}, soit quatre temps au total.`:`La note n° ${i+1} est ${q.answer}.`;
 }
 if(!prompt||!explain)throw Error('Missing French question '+id);
 const options=q.options?.map(o=>({...o,fr:option(q,o)}));
 return {prompt,explain,options,tiles:q.tiles?.map(t=>option(q,{label:t}))};
}
const titles=['Clé de sol et portée','Notes avec lignes supplémentaires','Lire la note avant le doigté','Ordre des dièses','Ordre des bémols','Comprendre l’armure','Altérations accidentelles','Ronde, blanche, noire et croche','Frapper noires et blanches','Frapper les croches','Tons, demi-tons et Ré majeur','Les quatre cordes à vide','Première position : note, corde, doigt','Quand rapprocher les doigts ?','Découvrir la troisième position','Plus aigu, plus grave ou pareil ?','Entendre tons et demi-tons','Associer mélodie et partition'];
const introText=[
 ['Le violon utilise la clé de sol. Sa boucle entoure la deuxième ligne : Sol3. Ici, les octaves suivent l’usage français : le Do central est Do3 et La3 vaut 440 hertz.','De bas en haut, les lignes donnent Mi, Sol, Si, Ré, Fa ; les interlignes Fa, La, Do, Mi. Une ligne puis un interligne font avancer d’un nom.'],
 ['Sol2, la corde la plus grave, se trouve sous la deuxième ligne supplémentaire. Depuis Mi3, descends : Ré3, Do3, Si2, La2, Sol2.'],
 ['Le chiffre 2 dit d’utiliser le majeur, pas quelle note jouer. Sur La en première position, il peut donner Do ou Do dièse ; sur Ré, Fa ou Fa dièse. Lis donc la note avant le doigté.'],
 ['Les dièses s’ajoutent toujours dans cet ordre : Fa, Do, Sol, Ré, La, Mi, Si.','En comptant le nom de départ comme premier, le cinquième nom donne le prochain dièse : Fa, Sol, La, Si, Do ; puis Do, Ré, Mi, Fa, Sol.'],
 ['Les bémols suivent l’ordre inverse : Si, Mi, La, Ré, Sol, Do, Fa.'],
 ['Les altérations après la clé forment l’armure. Elles concernent les notes correspondantes dans toutes les octaves. Dans cette portée, les deux Fa sont dièses.'],
 ['Le dièse monte d’un demi-ton, le bémol descend d’un demi-ton et le bécarre rend la note naturelle.','Une altération accidentelle concerne la même note à la même octave jusqu’à la fin de la mesure. Après la barre, l’armure reprend effet.'],
 ['Si la noire vaut un temps : ronde quatre temps, blanche deux temps, noire un temps, croche un demi-temps.','Avant de jouer, regarde l’armure, le chiffrage et le rythme. Place-toi, compte une mesure, puis entre calmement.'],
 ['Écoute quatre pulsations de préparation. Ensuite, frappe au début de chaque note. Pour une blanche, frappe une fois et tiens pendant deux temps.'],
 ['Deux croches font un temps. Compte « un et deux et » : les croches tombent sur les nombres et sur les « et ». Commence lentement, à cinquante ou soixante pulsations par minute.'],
 ['Touche le clavier. Deux touches voisines, noires comprises, sont séparées d’un demi-ton. Un ton comprend deux demi-tons. Entre Mi et Fa, puis Si et Do, il n’y a pas de touche noire.'],
 ['Touche les quatre cordes à vide et écoute : Sol, Ré, La, Mi.'],
 ['Les points indiquent les notes vérifiées en première position. Touche-les pour voir le nom et le doigt. Un deuxième doigt peut être bas ou haut.'],
 ['Sur une même corde, deux doigts voisins se rapprochent pour un demi-ton et s’écartent pour un ton. Cela dépend des notes, de la corde, de la tonalité et de la position.'],
 ['En troisième position, le premier doigt se place à une quarte au-dessus de la corde à vide : compte quatre noms en incluant le départ. Sur La : La, Si, Do, Ré. C’est la place du troisième doigt en première position.'],
 ['Active le son. Écoute chaque paire aussi souvent que nécessaire, puis choisis ta réponse.'],
 ['Un demi-ton est très proche ; un ton est deux fois plus large. Compare les deux exemples sur le clavier.'],
 ['Écoute en suivant la portée du doigt. Quand le son monte, les notes montent aussi.'],
];
const excerptNames=['Petite marche en Ré majeur','Petite danse en Sol majeur','Berceuse en Fa majeur','Le détective du bécarre','Petit rondo en Si bémol','Montée en La majeur','Petite course de croches','Ré majeur en troisième position'];
export const QUESTION_FR = new Map();
export function installFrench(){
 for(const q of bank().values()){
  const f=questionFrench(q);QUESTION_FR.set(q.id,f);register(q.prompt,f.prompt);register(q.explain,f.explain);
  q.options?.forEach((o,i)=>register(o.label,f.options[i].fr));q.tiles?.forEach((t,i)=>register(t,f.tiles[i]));
 }
 LESSONS.forEach((l,i)=>{
  register(l.title,i<18?titles[i]:`Détective de la partition · ${excerptNames[i-18]}`);
  l.intro?.forEach((c,j)=>{register(c.title,`${titles[i]} · ${j+1}`);register(c.text,introText[i][j]);if(c.widget?.caption)register(c.widget.caption,i===5?'Les deux Fa sont dièses, même sans signe devant la note.':i===6?'Mesure 1 : Fa naturel ; mesure 2 : retour à Fa dièse.':i===3?'Trois dièses : Fa, Do, Sol.':'Observe l’armure.');});
 });
 WORLDS.forEach((w,i)=>{register(w.name,w.fr);register(w.desc,['Notes, clé et premiers repères','Dièses, bémols, armure et bécarres','Durées, pulsation et frappes','Intervalles, cordes, positions et doigtés','Hauteurs, intervalles et mélodies','Déchiffrer une courte partition inconnue'][i]);});
 const skillNames=['Ordre des dièses','Ordre des bémols','Altérations et bécarres','Tons et demi-tons','Armure','Cordes à vide','Première position','Troisième position','Note, corde, doigté et position','Blanche','Noire','Croche','Pulsation régulière','Nom des notes','Lire les doigtés','Déchiffrage autonome','Hauteur des sons','Entendre les intervalles'];Object.values(SKILLS).forEach((s,i)=>register(s,skillNames[i]));
 EXCERPTS.forEach((ex,i)=>{
  register(ex.title,excerptNames[i]);register(`识谱侦探 · ${ex.title}`,`Détective de la partition · ${excerptNames[i]}`);
  register(`一段从没见过的短乐谱。先自己一步步解码，最后才能听示范。${ex.position==='third'?'这一段用第三把位。':'这一段用第一把位。'}`,`Une courte mélodie inconnue. Déchiffre-la pas à pas avant d’écouter le modèle. Joue en ${pos(ex.position)}.`);
  const steps=buildDetective(ex).steps,stepNames=['① Clé et armure','② Nom des notes','③ Hauteur réelle','④ Corde, position, doigté','⑤ Rythme','⑥ Écouter et suivre','⑦ Relire sans indice'];
  const hints=[['Regarde les dièses ou les bémols juste après la clé.','Compte les altérations et récite leur ordre.'],['Lignes : Mi, Sol, Si, Ré, Fa. Interlignes : Fa, La, Do, Mi.','Pars d’une note connue et avance ligne par interligne.'],['Cherche d’abord une altération devant la note, puis à l’armure.',alterations],[`Utilise la ${pos(ex.position)}. Lis le doigté avec la note.`,'Sur quelle corde ce doigt atteint-il cette note ?'],['Noire : un temps. Blanche : deux. Croche : un demi-temps.','Une mesure à 4/4 contient quatre temps.']];
  steps.forEach((s,j)=>{register(s.title,stepNames[j]);if(s.hint1)register(s.hint1,hints[j][0]);if(s.hint2)register(s.hint2,hints[j][1]);});
 });
 const taskTitles=['Réciter l’ordre des dièses','Réciter l’ordre des bémols','Comprendre dièse, bémol, bécarre et armure','Comprendre tons et demi-tons ; les demi-tons en Ré majeur','Lire la note avant le chiffre de doigté','Cordes et doigtés en première et troisième positions','Tenir une pulsation stable et observer avant de jouer','Jouer réellement du violon, lentement et régulièrement','Découvrir la mélodie de Fantaisie russe','Vibrato : objectif pour plus tard'];
 TEACHER_WEEKS.forEach(w=>{register(w.label,'Cours des 10 et 17 octobre');register(w.source,'Consignes des cours des 10 et 17 octobre, résumées par le parent');w.tasks.forEach((t,i)=>{register(t.title,taskTitles[i]);if(t.note)register(t.note,i===7?'Il faut vraiment jouer du violon. Seul un parent peut confirmer cette activité.':i===8?'Connaître la mélodie ne suffit pas à lire la partition seul. Consulte le cours de violon.':'Le professeur doit guider les gestes. Ici, aucune pratique du vibrato n’est demandée.');});});
 REPERTOIRE.forEach(r=>{register(r.source,r.id==='fantaisie-russe'?'Cours d’octobre 2026, résumé parental':'Source : notes existantes du cours de violon');if(r.pending)register(r.pending,'Les extraits vérifiés et l’enregistrement de ce morceau ne sont pas encore disponibles.');if(r.composerNote)register(r.composerNote,'Le nom du compositeur sera vérifié sur la partition originale.');if(r.facts)register(r.facts,r.id==='becker-gavotte'?'Les anciennes notes de cours donnent des indications de tonalité contradictoires. Vérifier sur la partition originale.':r.id==='bach-gavotte-d'?'Ré majeur : Fa dièse et Do dièse.':'Tenir les notes longues jusqu’au bout sans accélérer.');});
}
