"""Author deterministic narrated animation films with Pillow, VexFlow stills and ffmpeg.
No screen recording, external artwork or student information is used.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, math, concurrent.futures, shutil, sys
ROOT=Path(__file__).resolve().parents[1]
CAT=json.loads((ROOT/'tmp/music-quest-voice-catalog.json').read_text())
OUT=ROOT/'music-theory/video';OUT.mkdir(exist_ok=True)
WORK=ROOT/'tmp/music-quest-video-render';WORK.mkdir(exist_ok=True)
W,H,FPS=1280,720,12
FONT='/System/Library/Fonts/STHeiti Light.ttc'
fonts={n:ImageFont.truetype(FONT,n) for n in [18,22,24,26,28,32,38,44,60,76]}
symbol_fonts={n:ImageFont.truetype('/Library/Fonts/Arial Unicode.ttf',n) for n in fonts}
previous=json.loads((OUT/'manifest.json').read_text()).get('videos',[]) if (OUT/'manifest.json').exists() else []
NAVY=(15,17,46);CYAN=(110,222,255);PURPLE=(181,157,255);GOLD=(255,207,116);WHITE=(245,246,255)
base=Image.new('RGB',(W,H));dr=ImageDraw.Draw(base)
for y in range(H):
 c=tuple(int(a+(b-a)*y/H) for a,b in zip((16,20,51),(39,24,77)));dr.line((0,y,W,y),fill=c)
for x in range(0,W,64):dr.line((x,90,x,H),fill=(36,40,76))
for y in range(106,H,64):dr.line((0,y,W,y),fill=(36,40,76))

def txt(d,xy,s,size=28,fill=WHITE,anchor=None):d.text(xy,str(s),font=(symbol_fonts[size] if any(c in str(s) for c in '♯♭♮') else fonts[size]),fill=fill,anchor=anchor)
def box(d,rect,fill=(40,43,88),outline=(85,89,144),radius=24):d.rounded_rectangle(rect,radius,fill=fill,outline=outline,width=2)
def wrap(d,text,width,size=26):
 out=[];line=''
 # Character wrapping also works for Chinese; French wraps on words.
 tokens=list(text) if any('\u3400'<=c<='\u9fff' for c in text) else text.split(' ')
 sep='' if len(tokens)>0 and tokens!=text.split(' ') else ' '
 for word in tokens:
  candidate=line+(sep if line else '')+word
  if d.textlength(candidate,font=fonts[size])>width and line:out.append(line);line=word
  else:line=candidate
 if line:out.append(line)
 return out

def arrow(d,a,b,color=CYAN):
 d.line((*a,*b),fill=color,width=5);ang=math.atan2(b[1]-a[1],b[0]-a[0]);p=[b,(b[0]-18*math.cos(ang-.5),b[1]-18*math.sin(ang-.5)),(b[0]-18*math.cos(ang+.5),b[1]-18*math.sin(ang+.5))];d.polygon(p,fill=color)

def mascot(d,t):
 x,y=92,64+4*math.sin(t*2);r=32
 d.ellipse((x-r,y-r,x+r,y+r),fill=CYAN);d.ellipse((x-12,y-8,x-6,y),fill=NAVY);d.ellipse((x+7,y-8,x+13,y),fill=NAVY)
 d.arc((x-10,y+3,x+10,y+13+5*abs(math.sin(t*7))),0,180,fill=NAVY,width=3)
 d.line((x,y-r,x,y-r-17),fill=GOLD,width=3);d.ellipse((x,y-r-18,x+12,y-r-10),fill=GOLD)

def note(d,x,y,beats=1,size=22):
 d.ellipse((x-size,y-12,x+size,y+12),fill=WHITE if beats<2 else (35,38,75),outline=WHITE,width=4)
 if beats!=4:d.line((x+size-2,y,x+size-2,y-70),fill=WHITE,width=4)
 if beats==.5:d.arc((x+size-2,y-70,x+size+34,y-23),260,100,fill=WHITE,width=5)

score_cache={}
def score(image,name,rect=(210,160,1130,425)):
 if name not in score_cache:
  im=Image.open(ROOT/'tmp/music-quest-video-scores'/name).convert('RGB');im.thumbnail((rect[2]-rect[0],rect[3]-rect[1]),Image.Resampling.LANCZOS);score_cache[name]=im
 im=score_cache[name];image.paste(im,(int((rect[0]+rect[2]-im.width)/2),int((rect[1]+rect[3]-im.height)/2)))

def visual(im,kind,si,p,t,lang):
 d=ImageDraw.Draw(im);fr=lang=='fr'
 if kind=='staff':
  idx=4 if si==0 else (min(10,int(p*11)) if si in [1,2] else max(0,4-int(p*5)))
  score(im,f'staff-{idx}.png');d=ImageDraw.Draw(im)
  names=['Do3','Ré3','Mi3','Fa3','Sol3','La3','Si3','Do4','Ré4','Mi4','Fa4']
  box(d,(490,410,850,482),outline=CYAN);txt(d,(670,445),names[idx],44,CYAN,'mm')
  arrow(d,(151,390),(151,190));txt(d,(145,445),'↑',44,CYAN,'mm')
 elif kind=='chain':
  flat=si==2;names=['Si','Mi','La','Ré','Sol','Do','Fa'] if flat else ['Fa','Do','Sol','Ré','La','Mi','Si'];n=min(7,int(p*8)+1)
  for i in range(7):
   x=190+i*145;y=290+8*math.sin(t*2-i*.4) if i<n else 310
   if i>0:d.line((x-40,y,x-100,y),fill=PURPLE,width=6)
   box(d,(x-56,y-60,x+56,y+60),fill=(54,53,105) if i<n else (23,26,54),outline=GOLD if i==n-1 else PURPLE)
   if i<n:txt(d,(x,y-5),names[i],38,GOLD,'mm');txt(d,(x,y+87),'♭' if flat else '♯',38,PURPLE,'mm')
  txt(d,(650,180),'Si → Mi → La → Ré → Sol → Do → Fa' if flat else 'Fa → Do → Sol → Ré → La → Mi → Si',32,WHITE,'mm')
  if si==1:txt(d,(650,435),'Fa (1) → Sol (2) → La (3) → Si (4) → Do (5)',28,CYAN,'mm')
 elif kind=='accidentals':
  score(im,f'acc-{min(si,2)}.png');d=ImageDraw.Draw(im)
  labels=['Fa♯','Fa♯','Fa♯ ↑','Fa♯'] if si==0 else ['Fa♮','Fa♮','Fa♯ ↑','Fa♯']
  for i,n in enumerate(labels):
   x=355+i*215;box(d,(x-70,412,x+70,473),outline=GOLD if (si==2 and i==3) or (si==1 and i<2) else PURPLE);txt(d,(x,442),n,28,WHITE,'mm')
  txt(d,(650,130),'mesure 1                    |                    mesure 2' if fr else '第 1 小节                    |                    第 2 小节',26,CYAN,'mm')
 elif kind=='steps':
  # Semitone ladder counts black and white keys equally; piano below shows their actual placement.
  names=['Do','Do♯','Ré','Ré♯','Mi','Fa','Fa♯','Sol','Sol♯','La','Si♭','Si','Do','Do♯','Ré']
  start=4 if si==0 else 0;idx=(4+int(p*1.99)) if si==0 else min(12,int(p*13)) if si==1 else [2,4,6,7,9,11,13,14][min(7,int(p*8))]
  for i in range(15):
   x=145+i*70;y=350-i*8
   d.line((x,y,x+60,y),fill=PURPLE,width=5);txt(d,(x+27,y+35),names[i],22,WHITE,'mm')
  x=145+idx*70+27;y=320-idx*8-15*abs(math.sin(p*math.pi*8));d.ellipse((x-19,y-19,x+19,y+19),fill=GOLD)
  txt(d,(660,160),'1 demi-ton + 1 demi-ton = 1 ton' if fr else '1 个半音 + 1 个半音 = 1 个全音',38,CYAN,'mm')
  if si==2:txt(d,(650,430),'Ré – Mi – Fa♯ – Sol – La – Si – Do♯ – Ré',32,GOLD,'mm')
 elif kind=='rhythm':
  durs=[1,1,1,1] if si==0 else [2,2] if si==1 else [.5]*8 if si==2 else [1,.5,.5,2]
  d.line((235,355,1135,355),fill=PURPLE,width=5)
  for i in range(5):x=235+i*225;d.ellipse((x-8,347,x+8,363),fill=CYAN);txt(d,(x,410),str(i+1) if i<4 else '4/4',28,CYAN,'mm')
  beat=(p*8)%4;x=235+beat*225
  d.ellipse((x-24,327,x+24,375),fill=GOLD)
  b=0
  for length in durs:
   x0=235+b*225;x1=x0+length*225;box(d,(x0+2,205,x1-2,304),fill=(71,58,111),outline=GOLD if b<=beat<b+length else PURPLE,radius=12);note(d,(x0+x1)/2,265,length,14);b+=length
  txt(d,(665,145),'noire = 1 · blanche = 2 · croche = ½',28,WHITE,'mm')
 elif kind=='violin':
  strings=['Sol','Ré','La','Mi'];pos3=si==1 and p>.5;offset=80 if pos3 else 0
  for i,s in enumerate(strings):
   x=330+i*180;d.line((x,170,x,450),fill=PURPLE,width=6-i);txt(d,(x,145),s,32,CYAN,'mm')
   if si==0:
    r=20+6*abs(math.sin(t*3+i));d.ellipse((x-r,210-r,x+r,210+r),fill=GOLD if int(p*4)%4==i else (54,56,103))
  if si>0:
   x=690;y=330;d.ellipse((x-26,y-26,x+26,y+26),fill=GOLD);txt(d,(x,y),'1' if pos3 else '3',28,NAVY,'mm');txt(d,(960,330),'Ré4',38,GOLD,'mm')
   box(d,(490,190+offset,610,350+offset),fill=(52,54,108),outline=CYAN);txt(d,(550,270+offset),'1–2–3–4',22,CYAN,'mm')
   if si==2:
    txt(d,(650,440),'Do ↔ Do♯ : 1–2 ↔ 2–3',32,GOLD,'mm')
   else:txt(d,(650,475),('3e position : 1er doigt' if pos3 else '1re position : 3e doigt') if fr else ('第三把位：1 指' if pos3 else '第一把位：3 指'),28,CYAN,'mm')
 elif kind=='ear':
  if si==0:
   labels=['Plus aigu','Plus grave','Même hauteur'] if fr else ['更高','更低','相同']
   for i in range(3):
    x0=180+i*360;dy=[-85,85,0][i];pp=(p*2)%1
    box(d,(x0-35,145,x0+285,455),fill=(29,31,67),outline=PURPLE)
    d.line((x0,300,x0+250,300+dy),fill=PURPLE,width=5)
    x=x0+pp*250;y=300+dy*pp;d.ellipse((x-20,y-20,x+20,y+20),fill=GOLD)
    txt(d,(x0+125,410),labels[i],28,CYAN,'mm')
  else:
   for i in range(2):
    x0=240+i*560;dy=55*(i+1);pp=(p*2)%1
    d.line((x0,330,x0+260,330-dy),fill=PURPLE,width=6)
    for j in range(i+2):d.ellipse((x0+j*260/(i+1)-7,330-j*dy/(i+1)-7,x0+j*260/(i+1)+7,330-j*dy/(i+1)+7),fill=CYAN)
    x=x0+pp*260;y=330-dy*pp;d.ellipse((x-22,y-22,x+22,y+22),fill=GOLD)
    txt(d,(x0+130,425),('1 demi-ton' if i==0 else '1 ton = 2 demi-tons') if fr else ('1 个半音' if i==0 else '1 个全音 = 2 个半音'),28,CYAN,'mm')
 elif kind=='detective':
  labels=['Armure','Notes','Altérations','Corde / doigt','Rythme'] if fr else ['看调号','认音名','看升降','找弦和手指','读节奏']
  count=min(5,int(p*6)+1)
  for i,label in enumerate(labels):
   x=185+i*223;active=i<count
   if i:arrow(d,(x-150,290),(x-90,290),PURPLE)
   box(d,(x-80,205,x+80,365),fill=(57,51,104) if active else (23,26,54),outline=GOLD if i==count-1 else PURPLE)
   txt(d,(x,250),str(i+1),44,GOLD if active else PURPLE,'mm');txt(d,(x,320),label,22,WHITE,'mm')
  txt(d,(650,440),'Observer → comprendre → essayer → vérifier' if fr else '先观察 → 再理解 → 自己读 → 听后核对',32,CYAN,'mm')

def probe(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)]))
def render(s,lang):
 name=f"{s['id']}-{lang}";dest=OUT/(name+'.mp4')
 if '--force' not in sys.argv and dest.exists() and dest.stat().st_size>10000:
  old=next((v for v in previous if v['id']==s['id'] and v['lang']==lang and v.get('steps')),None)
  if old:return old
 files=[ROOT/'music-theory/audio/voice'/(step['voice'][lang]+'.mp3') for step in s['steps']]
 assert all(p.exists() and p.stat().st_size>1000 for p in files)
 durations=[probe(p) for p in files];duration=sum(durations)
 concat=WORK/(name+'.txt');concat.write_text(''.join("file '"+str(p).replace("'","'\\''")+"'\n" for p in files))
 narration=WORK/(name+'.m4a');subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c:a','aac','-b:a','96k',str(narration)],check=True)
 command=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(narration),'-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-c:a','copy','-shortest','-movflags','+faststart',str(dest)]
 process=subprocess.Popen(command,stdin=subprocess.PIPE);starts=[0]
 for d in durations:starts.append(starts[-1]+d)
 for frame in range(math.ceil(duration*FPS)):
  t=frame/FPS;si=min(len(durations)-1,next((i for i in range(len(durations)) if t<starts[i+1]),len(durations)-1));p=max(0,min(1,(t-starts[si])/durations[si]));step=s['steps'][si]
  im=base.copy();d=ImageDraw.Draw(im);mascot(d,t)
  txt(d,(145,38),'MUSIC QUEST · '+('ANIMATION' if lang=='fr' else '动画课堂'),22,CYAN)
  txt(d,(145,70),s['title'][lang=='fr'],32,WHITE)
  visual(im,s['kind'],si,p,t,lang);d=ImageDraw.Draw(im)
  box(d,(45,500,1235,695),fill=(21,24,57),outline=(90,91,139))
  txt(d,(70,515),f'{si+1:02d}  '+step['title'][lang=='fr'],28,GOLD)
  lines=wrap(d,step[lang],1130,26)
  for j,line in enumerate(lines):txt(d,(70,555+j*32),line,26)
  d.rounded_rectangle((45,708,1235,714),3,fill=(48,47,84));d.rounded_rectangle((45,708,45+1190*t/duration,714),3,fill=CYAN)
  if frame==min(24,math.ceil(duration*FPS)-1):im.save(OUT/(name+'.jpg'),quality=90)
  process.stdin.write(im.tobytes())
 process.stdin.close();assert process.wait()==0,name
 info={'id':s['id'],'lang':lang,'duration':probe(dest),'bytes':dest.stat().st_size,'steps':[{'start':round(starts[i],3),'end':round(starts[i+1],3),'text':step[lang]} for i,step in enumerate(s['steps'])]}
 print('RENDERED',name,round(info['duration'],1),info['bytes'],flush=True);return info
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(lambda x:render(*x),[(s,lang) for s in CAT['studios'] for lang in ['zh','fr']]))
 (OUT/'manifest.json').write_text(json.dumps({'author':'Music Quest original instructional animation','voices':{'zh':'Microsoft Xiaoxiao Neural','fr':'Microsoft Denise Neural'},'videos':results},ensure_ascii=False,indent=2))
