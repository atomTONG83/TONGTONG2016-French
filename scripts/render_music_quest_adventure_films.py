"""V2.2 original films: 24 fps, layered lighting, clean concept cards and smooth entrances.
Reuses authored narration and verified score diagrams; no student data or new TTS calls.
Preparation: node scripts/music_quest_voice_catalog.mjs > tmp/music-quest-voice-catalog.json
and node scripts/render_music_quest_scores.mjs. Existing audio/voice MP3 files must be present.
Use --samples for every scene's stills, then run without flags for 16 films and manifest.
Requires Pillow, ffmpeg/ffprobe, the fonts used by render_music_quest_videos.py and score renderer.
Videos show concise key points; complete synchronized bilingual narration remains in the page.
"""
from pathlib import Path
import importlib.util,json,math,subprocess,concurrent.futures,sys
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mq_legacy_renderer',ROOT/'scripts/render_music_quest_videos.py');old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
W,H,FPS=1280,720,24
OUT=ROOT/'music-theory/video';WORK=ROOT/'tmp/music-quest-adventure-render';WORK.mkdir(exist_ok=True)
C=(146,226,255);P=(173,168,255);WHITE=(236,244,255)
old.CYAN=C;old.PURPLE=P;old.GOLD=(169,232,255);old.WHITE=WHITE;old.NAVY=(13,27,45)
KEYS={
'staff':[['Sol3 住在第二条线上','Sol3 habite sur la deuxième ligne'],['线、间交替，一个台阶一个音','Ligne, interligne : une note à chaque pas'],['线：Mi Sol Si Ré Fa · 间：Fa La Do Mi','Lignes : Mi Sol Si Ré Fa · Interlignes : Fa La Do Mi'],['往下数台阶，也能找到低音','Compte les pas vers le bas pour les notes graves']],
'sharps':[['升号顺序：Fa Do Sol Ré La Mi Si','Dièses : Fa Do Sol Ré La Mi Si'],['从一个升号，数到第五个音名','Compte cinq noms de notes depuis le dièse'],['倒过来：Si Mi La Ré Sol Do Fa','À l’envers : Si Mi La Ré Sol Do Fa']],
'accidentals':[['调号管所有八度的同名音','L’armure s’applique à toutes les octaves'],['同小节、同音名、同八度，才会延续','Même mesure, même note, même octave'],['过了小节线，重新按调号','Nouvelle mesure : retour à l’armure']],
'steps':[['Mi → Fa：相邻的两个键，就是半音','Mi → Fa : deux touches voisines, un demi-ton'],['两次半音，合成一个全音','Deux demi-tons font un ton'],['全 全 半 全 全 全 半 · Ré 大调','Ton ton demi-ton ton ton ton demi-ton']],
'rhythm':[['一拍一站，保持同样的间隔','Un temps par gare, à intervalles réguliers'],['二分音符占两拍，只在开头敲一下','Une blanche : deux temps, une frappe au début'],['一拍里的两半：一、和、二、和','Deux moitiés par temps : un et deux et'],['把一小节装满：一共四拍','Compose une mesure de quatre temps']],
'violin':[['从低到高：Sol Ré La Mi 四根空弦','Du grave à l’aigu : Sol Ré La Mi'],['同一个 Ré：第一把位三指，第三把位一指','Le même Ré : 3e doigt en I, 1er doigt en III'],['手指距离跟随音高，动作听老师指导','L’écartement suit les notes ; le geste suit le professeur']],
'ear':[['先听方向：上行、下行，还是重复？','Écoute : ça monte, descend ou se répète ?'],['半音一步，全音两步，再藏起图来听','Un pas ou deux ? Cache le dessin et écoute']],
'detective':[['先找谱号、调号、拍号三条线索','Observe d’abord la clé, l’armure et le chiffrage'],['音名 → 实际音高 → 指法 → 节奏','Nom → hauteur réelle → doigté → rythme'],['先自己读，听示范只是为了核对','Lis seul ; le modèle sert ensuite à vérifier']]
}
def box(d,rect,fill=(24,43,66),outline=(80,113,145),radius=22):
 d.rounded_rectangle(rect,radius,fill=fill,outline=outline,width=2)
 x0,y0,x1,y1=rect
 d.line((x0+radius,y0+2,x1-radius,y0+2),fill=tuple(min(255,int(c*1.25)) for c in outline),width=1)
old.box=box
base=Image.new('RGB',(W,H));d=ImageDraw.Draw(base)
for y in range(H):
 for x in range(0,W,4):
  light=max(0,1-math.hypot((x-1050)/1050,(y-120)/650));t=y/H
  rgb=(int(9+6*t+light*13),int(19+9*t+light*19),int(35+13*t+light*32))
  d.rectangle((x,y,x+3,y),fill=rgb)
for x in range(40,W,80):d.line((x,112,x,490),fill=(29,46,67))
for y in range(132,490,64):d.line((45,y,1235,y),fill=(29,46,67))
d.arc((770,-200,1500,540),30,300,fill=(51,69,108),width=1);d.arc((930,-110,1420,380),0,290,fill=(47,68,98),width=1)
for x,y,r in [(1050,125,3),(1180,390,2),(150,460,2),(820,70,2)]:d.ellipse((x-r,y-r,x+r,y+r),fill=(116,151,189))
# Original gradient mascot, prepainted at 2x for antialiased edges.
avatar=Image.new('RGBA',(156,156));ad=ImageDraw.Draw(avatar)
for r in range(60,0,-1):
 v=1-r/60;ad.ellipse((78-r,78-r,78+r,78+r),fill=(int(137+60*v),int(198+35*v),255,255))
ad.ellipse((53,67,65,84),fill=(24,44,76));ad.ellipse((93,67,105,84),fill=(24,44,76));ad.ellipse((57,68,61,73),fill='white');ad.ellipse((97,68,101,73),fill='white');ad.arc((66,88,91,105),0,180,fill=(32,52,87),width=4);ad.ellipse((43,87,58,95),fill=(214,165,197));ad.ellipse((99,87,114,95),fill=(214,165,197));ad.line((79,19,79,3,96,11),fill=(191,216,255),width=4)
avatar=avatar.resize((78,78),Image.Resampling.LANCZOS)
def header(im,s,lang,si,t):
 d=ImageDraw.Draw(im);im.paste(avatar,(35,int(14+2*math.sin(t*1.7))),avatar)
 old.txt(d,(123,29),'MUSIC QUEST / DISCOVERY CINEMA',18,(139,170,204));old.txt(d,(123,58),s['title'][lang=='fr'],28,WHITE)
 box(d,(1090,29,1235,76),fill=(25,44,67),outline=(69,105,139),radius=14);old.txt(d,(1162,52),f'{si+1:02d} / {len(s["steps"]):02d}',22,C,'mm')
 d.line((45,105,1235,105),fill=(61,84,112),width=1)
def frame(s,lang,si,p,t,duration):
 im=base.copy();stage=base.copy();old.visual(stage,s['kind'],si,p,t,lang)
 alpha=min(1,max(0,p*12));alpha=alpha*alpha*(3-2*alpha)
 im=Image.blend(im,stage,alpha) if alpha<1 else stage
 header(im,s,lang,si,t);d=ImageDraw.Draw(im)
 box(d,(45,504,1235,680),fill=(17,33,53),outline=(64,94,123),radius=21)
 label=s['steps'][si]['title'][lang=='fr'];old.txt(d,(72,523),f'{si+1:02d}  '+label,24,(155,196,227))
 key=KEYS[s['id']][si][lang=='fr'];lines=old.wrap(d,key,1120,32)
 assert len(lines)<=2,(s['id'],si,lang,'Concept text overflow')
 for j,line in enumerate(lines):old.txt(d,(72,568+j*39),line,32,WHITE)
 d.rounded_rectangle((45,700,1235,706),3,fill=(34,53,77));d.rounded_rectangle((45,700,45+max(6,1190*t/duration),706),3,fill=C)
 return im

def render(s,lang):
 name=f'{s["id"]}-{lang}';dest=OUT/(name+'.mp4');temp=WORK/(name+'.mp4')
 files=[ROOT/'music-theory/audio/voice'/(step['voice'][lang]+'.mp3') for step in s['steps']];durations=[old.probe(x) for x in files];duration=sum(durations);starts=[0]
 for d in durations:starts.append(starts[-1]+d)
 poster=frame(s,lang,0,.3,1,duration);poster.save(OUT/(name+'.jpg'),quality=94)
 if '--samples' in sys.argv:
  for si in range(len(durations)):frame(s,lang,si,.6,starts[si]+durations[si]*.6,duration).save(WORK/(name+f'-{si}.jpg'),quality=94)
  return
 concat=WORK/(name+'.txt');concat.write_text(''.join("file '"+str(p).replace("'","'\\''")+"'\n" for p in files));audio=WORK/(name+'.m4a')
 subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c:a','aac','-b:a','96k',str(audio)],check=True)
 cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(audio),'-c:v','libx264','-preset','veryfast','-threads','2','-crf','25','-pix_fmt','yuv420p','-c:a','copy','-shortest','-movflags','+faststart',str(temp)]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(math.ceil(duration*FPS)):
  t=i/FPS;si=min(len(durations)-1,next((k for k in range(len(durations)) if t<starts[k+1]),len(durations)-1));p=(t-starts[si])/durations[si]
  proc.stdin.write(frame(s,lang,si,p,t,duration).tobytes())
 proc.stdin.close();assert proc.wait()==0
 assert temp.stat().st_size<4*1024*1024,name+' exceeds protected media limit'
 info={'id':s['id'],'lang':lang,'duration':old.probe(temp),'bytes':temp.stat().st_size,'fps':FPS,'steps':[{'start':round(starts[i],3),'end':round(starts[i+1],3),'text':step[lang]} for i,step in enumerate(s['steps'])]}
 temp.replace(dest);print('RENDERED',name,info['bytes'],flush=True);return info
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda x:render(*x),[(s,lang) for s in old.CAT['studios'] for lang in ['zh','fr']]))
 if '--samples' not in sys.argv:
  m={'author':'Music Quest original instructional animation','edition':'Adventure Cinema 2.2','fps':FPS,'voices':{'zh':'Microsoft Xiaoxiao Neural','fr':'Microsoft Denise Neural'},'videos':results};p=OUT/'manifest.json';temp=WORK/'manifest.json';temp.write_text(json.dumps(m,ensure_ascii=False,indent=2));temp.replace(p)
