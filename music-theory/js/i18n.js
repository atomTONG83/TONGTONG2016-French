// Explicit Chinese/French pairs; language switching never recreates a question.
const dictionary = new Map();
export function register(zh, fr) { if (zh && fr) dictionary.set(String(zh), String(fr)); }
export function french(zh) {
  const s=String(zh); if(dictionary.has(s))return dictionary.get(s);
  for(const [pattern,fn] of patterns){const m=s.match(pattern);if(m)return fn(...m.slice(1));}
  if(!/[\u3400-\u9fff]/u.test(s))return s;
  return null;
}
export function bilingual(zh, fr=french(zh)) {
  if(!fr || fr===String(zh))return document.createTextNode(String(zh));
  const wrap=document.createElement('span');wrap.className='bi';
  const a=document.createElement('span');a.lang='zh-CN';a.className='lang-zh';a.textContent=zh;
  const b=document.createElement('span');b.lang='fr';b.className='lang-fr';b.textContent=fr;
  wrap.append(a,b);return wrap;
}
export function setText(el, zh, fr=french(zh)) { if(el._biText===zh && el._biFrench===fr)return;el._biText=zh;el._biFrench=fr;el.replaceChildren(bilingual(zh,fr)); }
export function accessible(zh) { const fr=french(zh);return fr&&fr!==zh?`${zh} / ${fr}`:zh; }
export function setLanguage(mode) { document.documentElement.dataset.language=['both','zh','fr'].includes(mode)?mode:'both';document.documentElement.lang=mode==='fr'?'fr':'zh-CN'; }
const pairs={
 '动画课堂':'Cinéma musical','闯关':'Défis','小音 Mino：':'Mino :','今天想解锁哪条乐理规则？':'Quelle règle musicale veux-tu découvrir aujourd’hui ?',
 '间隔复习：次日 → 3 天 → 7 天 → 14 天':'Révisions après 1, 3, 7 puis 14 jours',
 '五线谱水手':'Marin de la portée','升降号学徒':'Apprenti des altérations','节奏守护者':'Gardien du rythme','指板探险家':'Explorateur de la touche','识谱侦探':'Détective des notes','乐理骑士':'Chevalier de la musique',
 '节奏很稳！🎯':'Pulsation très stable ! 🎯','大部分都对上了，再来一次会更稳。':'La plupart des notes sont en place. Encore un essai pour stabiliser.',
 '没关系，节奏是练出来的。先慢一点，跟着滴答声数拍。':'Le rythme s’apprend. Ralentis et compte avec le métronome.',
 '整体有点「抢拍」：敲之前先在心里数「1、2、3、4」，等拍子到了再敲。':'Tu anticipes un peu. Compte un, deux, trois, quatre et attends la pulsation.',
 '整体稍微「拖后」：跟着滴答声提前准备好手指。':'Tu arrives un peu après la pulsation. Prépare le doigt avant le clic.',
 '乐理冒险岛':'L’île des aventures musicales','大厅':'Accueil','地图':'Carte','复习':'Révision','任务':'Missions','家长':'Parents',
 '← 童童空间':'← Espace Tongtong','🎻 小提琴空间':'🎻 Espace violon','冒险地图':'Carte des aventures','今日任务':'Ta mission du jour',
 '最近进度':'Tes dernières aventures','还没有完成的关卡。从「今日任务」开始第一关吧。':'Commence ta première aventure avec la mission du jour.',
 '开始':'Commencer','上一步':'Retour','下一步':'Suivant','开始答题':'À toi de répondre','检查答案':'Vérifier','再试一次':'Réessayer','继续':'Continuer',
 '看过答案，继续':'J’ai lu la réponse, continuer','下一题':'Question suivante','回到地图':'Revenir à la carte','冒险大厅':'Accueil des aventures',
 '观察':'Observer','试听':'Écouter','发现规律':'Comprendre','动手操作':'Manipuler','独立作答':'Répondre seul',
 '经验 XP':'Expérience XP','连续学习天数':'Jours de suite','待复习':'À revoir','音符见习生':'Apprenti des notes','旋律探索者':'Explorateur des mélodies','乐理小勇士':'Aventurier de la musique',
 '🔇 已静音':'🔇 Son coupé','🔊 声音开':'🔊 Son activé','🔈 开启声音':'🔈 Activer le son','⚠ 无法开启声音':'⚠ Son indisponible',
 '🔈 先开启声音':'🔈 Activer le son d’abord','🔊 声音已开启':'🔊 Son activé','无法开启声音，请检查静音开关':'Son indisponible : vérifie le mode silencieux.',
 '▶ 听一听':'▶ Écouter','▶ 再听一次':'▶ Réécouter','▶ 听正确的音':'▶ Écouter la note correcte','▶ 听这四个音':'▶ Écouter les quatre notes',
 '▶ 听示范':'▶ Écouter le modèle','▶ 播放示范':'▶ Écouter le modèle','再来一次':'Encore une fois','完成！':'Terminé !',
 '🗺 进入冒险地图':'🗺 Explorer la carte','🔁 复习':'🔁 Réviser','📋 老师任务':'📋 Missions du cours','🎻 回小提琴空间':'🎻 Retour au violon',
 '六个世界沿着一条五线谱展开。发光的音符是推荐的下一关；所有关卡都可以随时进入、反复练习。':'Six mondes à explorer. La note lumineuse indique la prochaine aventure conseillée. Tu peux toujours choisir et rejouer un niveau.',
 '乐理关卡每关 3–7 分钟。今天也别忘了真正拿起琴，慢速练 20–30 分钟。':'Chaque aventure dure 3 à 7 minutes. Garde aussi un moment pour jouer lentement de ton vrai violon, selon les conseils de ton professeur.',
 '可以选多个，选好后点「检查答案」。':'Plusieurs réponses sont possibles. Choisis-les, puis vérifie.',
 '按顺序点选（或拖到上方），点上方的块可以取回。':'Touche les cartes dans l’ordre ou fais-les glisser en haut. Retouche une carte placée pour la reprendre.',
 '答对了！':'Bonne réponse !','完全正确！':'Tout à fait !','关卡完成！':'Aventure terminée !','关卡完成，继续加油！':'Aventure terminée, tu progresses !',
 ' 第一次就答对':' du premier coup','这次对了！记住这个规则，明天还会再见到它。':'Cette fois, c’est juste ! Cette règle reviendra demain pour t’aider à la retenir.',
 '还差一点。先读一读下面的规则，再试一次。':'Presque ! Lis ou écoute la règle ci-dessous, puis réessaie.',
 '正确率 60% 以上才有完成奖励。错题会自动安排到明天复习。':'La récompense arrive à partir de 60 % de bonnes réponses. Les erreurs reviennent demain.',
 '同一关今天已经领过完成奖励。':'Tu as déjà reçu la récompense de ce niveau aujourd’hui.',
 '点一个圆点：听声音、看音名和手指。':'Touche un point pour entendre la note et voir son nom et le doigt.',
 '到期复习':'Révision du jour','错题再练':'Revoir les erreurs','现在没有需要复习的题':'Rien à réviser pour le moment',
 '答过的题会按「次日 → 3 天 → 7 天 → 14 天」自动回来；答错的题明天就会出现在这里。':'Les questions reviennent après 1, 3, 7 puis 14 jours. Une erreur revient dès le lendemain.',
 '去地图学新关卡':'Découvrir un nouveau niveau','本周老师任务':'Missions du cours','曲目与技能标签':'Morceaux et compétences',
 '曲目内容以小提琴页面为准，这里只标出每首曲子会用到的乐理技能。':'Consulte la page violon pour les morceaux. Ici, tu retrouves les compétences utiles pour les jouer.',
 '🎻 打开小提琴空间看课程记录':'🎻 Ouvrir les notes du cours de violon','关于揉弦 vibrato':'À propos du vibrato',
 '揉弦是左手手指在按弦的位置上做有控制的、细小的来回摆动，让长音更有歌唱感。它是这一年的后续目标。':'Le vibrato est un petit mouvement contrôlé du doigt de la main gauche qui fait chanter les notes tenues. C’est un objectif pour plus tard.',
 '揉弦的手腕、手指动作需要老师当面示范和纠正，所以这里只介绍概念，不安排揉弦动作练习。':'Le professeur doit montrer et corriger le mouvement du poignet et des doigts. Ici, on découvre seulement l’idée, sans exercice gestuel.',
 '后续目标':'Pour plus tard','未开始':'Pas encore commencé','进步中':'En progrès','需复习':'À revoir','较熟练':'Bien à l’aise',
 ' 家长确认':' Confirmation du parent','家长已确认':'Confirmé par un parent','待家长确认':'À confirmer par un parent',
 '已记录：家长确认':'Confirmation enregistrée','已取消确认':'Confirmation retirée','家长视图':'Vue parents',
 '以下数字全部来自本设备上真实的作答记录。':'Ces chiffres viennent des réponses réellement enregistrées sur cet appareil.',
 '本周学习天数':'Jours d’activité cette semaine','本周完成关卡':'Niveaux terminés cette semaine','本周作答':'Réponses cette semaine','第一次答对率':'Réussite au premier essai',
 '技能表现':'Compétences','技能':'Compétence','状态':'État','最近正确率':'Réussite récente','作答':'Réponses','薄弱点':'Points à revoir',
 '状态说明：「较熟练」= 最近至少 5 次中 85% 以上第一次答对且没有到期题；不使用「已掌握」这样的绝对标签。':'« Bien à l’aise » signifie au moins cinq essais récents, 85 % de réussite au premier essai et aucune révision échue. Cela ne signifie pas une maîtrise définitive.',
 '目前没有反复出错的题。':'Aucune erreur répétée pour le moment.','老师任务完成情况':'Suivi des missions du cours','实体练琴类任务无法由应用判断，需要家长勾选确认。':'L’application ne peut pas vérifier le jeu sur un vrai violon. Un parent doit le confirmer.',
 '最近节奏挑战':'Derniers défis rythmiques','还没有节奏挑战记录。':'Aucun défi rythmique enregistré.','数据保存':'Conserver les progrès',
 '学习记录保存在这台设备的浏览器里（localStorage：tt_music_quest_v1），':'Les progrès sont conservés dans le navigateur de cet appareil (tt_music_quest_v1). ',
 '目前不会跨设备同步':'Ils ne sont pas synchronisés entre appareils','。换设备或清理浏览器数据前，请先导出备份。':'. Avant de changer d’appareil ou d’effacer les données, exporte une sauvegarde.',
 '导出备份':'Exporter une sauvegarde','从备份恢复':'Restaurer une sauvegarde','已从备份恢复':'Sauvegarde restaurée',
 '注意：当前浏览器不允许保存（可能是无痕模式），刷新后记录会丢失。':'Ce navigateur ne permet pas la sauvegarde. Les progrès seront perdus au rechargement.',
 '没有找到这一关':'Niveau introuvable','页面出错了':'La page n’a pas pu s’ouvrir','请刷新页面重试。学习记录不会因此丢失。':'Recharge la page pour réessayer. Les progrès enregistrés restent conservés.','回到冒险大厅':'Revenir à l’accueil',
 '先点「听示范」，再点「开始」。会先响 4 下预备拍。':'Écoute le modèle, puis commence. Quatre pulsations te préparent.',
 '速度（每分钟拍数）：':'Tempo en pulsations par minute :','敲 · TAP':'TAP','准备……':'Prépare-toi…','现在跟着节奏敲！':'À toi de frapper le rythme !',
 '示范：每个音开始时，就是你要敲的时刻。':'Modèle : frappe seulement au début de chaque note.',
 '声音无法开启：请检查设备静音开关后再点一次。':'Le son ne démarre pas. Vérifie le mode silencieux, puis réessaie.',
 '声音被关闭了：先在右上角打开声音，才能听到节拍器。':'Active le son en haut à droite pour entendre le métronome.',
 '再来一次：先听预备拍。':'Recommence en écoutant les pulsations de préparation.',
 '暂停了：切换到别的页面时节拍器会停止。准备好后点「开始」重来。':'Pause : le métronome s’arrête en arrière-plan. Appuie sur Commencer pour reprendre depuis le début.',
 '暂停了：窗口失去焦点。准备好后点「开始」重来。':'Pause : la fenêtre n’est plus active. Recommence quand tu es prêt.',
 '现在提示都关掉了。不听示范、不看提示，从第一个音读到最后一个音。':'Les indices sont maintenant cachés. Lis toutes les notes sans écouter le modèle.',
 '解码完成！现在听标准示范，眼睛跟着发光的音符走。':'Déchiffrage terminé ! Écoute le modèle en suivant les notes lumineuses.',
 '声音无法开启：请检查设备静音开关。':'Son indisponible : vérifie le mode silencieux.',
 '可以再听一遍，或者继续最后一步。':'Tu peux réécouter ou passer à la dernière étape.','继续：独立再读一遍':'Continuer : relire seul','解码完成！':'Déchiffrage terminé !',
 '独立读谱很稳！明天换一段新谱子试试。':'Tu déchiffres avec assurance ! Essaie une nouvelle mélodie demain.',
 '独立再读还有几个音没读准，复习时会再出现。拉琴前也用同样的顺序先读一遍。':'Quelques notes restent à revoir. Elles reviendront en révision. Utilise aussi ces étapes avant de jouer du violon.',
 '最后一层：听一听这个音的实际音高。':'Dernier indice : écoute la hauteur réelle de cette note.',
};
Object.entries(pairs).forEach(([zh,fr])=>register(zh,fr));
const patterns=[
 [/^今天已经完成 (\d+) 关，做得好！$/,n=>`Tu as terminé ${n} niveau(x) aujourd’hui, bravo !`],
 [/^有 (\d+) 道题到了复习时间，先热热身？$/,n=>`${n} question(s) à revoir aujourd’hui. On s’échauffe ?`],
 [/^示范速度 (\d+) BPM。听熟旋律很好，但下一步还是要靠自己看谱读出来。$/,n=>`Modèle à ${n} BPM. Ensuite, lis la partition par toi-même.`],
 [/^分步解码第一次就答对：(.*)$/,n=>`Déchiffrage au premier essai : ${n}`],
 [/^不看提示独立再读：(.*)$/,n=>`Lecture sans indices : ${n}`],
 [/^ 错 (\d+) 次 · 对 (\d+) 次 · (.*)$/,(w,c,s)=>` ${w} erreur(s) · ${c} réussite(s) · ${french(s)||s}`],
 [/^对上 (\d+)\/(\d+) 个音（(\d+) 个很准）(.*)$/,(a,b,c)=>`${a}/${b} notes en place, dont ${c} très précises.`],
 [/^多敲了 (\d+) 下：(.*)$/,n=>`${n} frappe(s) en trop. Frappe seulement au début de chaque note.`],
 [/^有 (\d+) 个音没对上，可以把速度调慢一点再试。$/,n=>`${n} note(s) manquée(s). Essaie plus lentement.`],
 [/^第 (\d+) \/ (\d+) 题$/, (a,b)=>`Question ${a} sur ${b}`],
 [/^约 (\d+) 分钟$/,n=>`Environ ${n} minutes`], [/^(\d+) 分钟$/,n=>`${n} minutes`],
 [/^(.*) · 约 (\d+) 分钟$/,(a,n)=>`${french(a)||a} · environ ${n} min`],
 [/^最好 (\d+)%$/,n=>`Meilleur résultat : ${n} %`], [/^推荐$/,()=> 'Conseillé'],
 [/^完成奖励 \+(\d+) XP$/,n=>`Récompense : +${n} XP`],
 [/^这次需要再看看的 (\d+) 题$/,n=>`${n} question(s) à revoir`],
 [/^复习 (\d+) 道到期题$/,n=>`Revoir ${n} question(s) du jour`],
 [/^第 (\d+) 个音：$/,n=>`Note n° ${n} :`],
 [/^预备拍 (\d+) \/ 4 · 先别敲$/,n=>`Préparation ${n} / 4 · attends avant de frapper`],
 [/^💡 提示（(\d+) 层）$/,n=>`💡 ${n} niveaux d’indices`],
 [/^提示 (\d+)：(.*)$/,(n,t)=>`Indice ${n} : ${french(t)||t}`],
 [/^(\d+) 道题。每道题都来自你之前练过的关卡，答对后间隔会变长。$/,n=>`${n} questions déjà rencontrées. Une bonne réponse espace la prochaine révision.`],
 [/^ 最好 (\d+)% · 完成 (\d+) 次$/,(a,b)=>` Meilleur : ${a} % · terminé ${b} fois`],
 [/^已点：(.*)$/,s=>`Notes jouées : ${s}`],
 [/^.*弦 · (第一把位|第三把位|空弦) · (.*) → (.*)$/, (p,f,n)=>`${p==='第一把位'?'1re position':p==='第三把位'?'3e position':'Corde à vide'} · ${f.replace('指','e doigt')} → ${n}`],
];
