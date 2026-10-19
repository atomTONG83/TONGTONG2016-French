"""Pre-generate Microsoft Edge natural speech for authored public teaching text.
Run with the isolated edge-tts 7.3.1 environment. No student data is transmitted.
"""
from pathlib import Path
import asyncio, json, subprocess, hashlib, re
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
CAT=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/music_quest_voice_catalog.mjs')],cwd=ROOT))
OUT=ROOT/'music-theory/audio/voice';OUT.mkdir(parents=True,exist_ok=True)
VOICES={'zh':'zh-CN-XiaoxiaoNeural','fr':'fr-FR-DeniseNeural'}
semaphore=asyncio.Semaphore(2)
async def generate(clip):
 p=OUT/(clip['key']+'.mp3')
 if p.exists() and p.stat().st_size>1000:return
 async with semaphore:
  for attempt in range(3):
   try:
    text=clip['text']
    if clip['lang']=='zh':
     for a,b in [('Do','多'),('Ré','来'),('Mi','咪'),('Fa','发'),('Sol','索'),('La','拉'),('Si','西')]:text=re.sub(r'(?<![A-Za-z])'+a+r'(?![A-Za-z])',b,text)
     text=text.replace('Hz','赫兹').replace('BPM','拍每分钟')
    part=p.with_suffix('.part')
    await asyncio.wait_for(edge_tts.Communicate(text,VOICES[clip['lang']],rate='-8%').save(str(part)),timeout=65)
    assert part.stat().st_size>1000
    part.replace(p);print('READY',clip['lang'],clip['key'],flush=True);return
   except Exception as e:
    if attempt==2:raise RuntimeError(f"Voice {clip['key']} failed: {type(e).__name__}") from None
    await asyncio.sleep(2*(attempt+1))
async def main():
 await asyncio.gather(*(generate(c) for c in CAT['clips']))
 manifest={c['key']:{'lang':c['lang'],'text':c['text'],'voice':VOICES[c['lang']],'sha256':hashlib.sha256((OUT/(c['key']+'.mp3')).read_bytes()).hexdigest()} for c in CAT['clips']}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 (ROOT/'tmp/music-quest-voice-catalog.json').write_text(json.dumps(CAT,ensure_ascii=False,indent=2))
 print('COMPLETE',len(manifest),flush=True)
asyncio.run(main())
