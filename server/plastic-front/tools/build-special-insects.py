"""Bake two original toy insect meshes with the project's existing CPU renderer.
Run with numpy and Pillow installed: python tools/build-special-insects.py
Combat and collision shapes remain independent of the visual mesh.
"""
from pathlib import Path
import importlib.util, math, json
from PIL import Image, ImageDraw
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('toy',Path(__file__).with_name('build-toy-insects.py'))
toy=importlib.util.module_from_spec(spec);spec.loader.exec_module(toy)
def mesh(kind,frame):
 base='ant' if kind=='bombBug' else 'beetle'
 toy.COLORS[base]=(164,65,36) if kind=='bombBug' else (69,125,115)
 toy.SCALES[base]=1.12 if kind=='bombBug' else .96
 m=toy.toy_insect(base,frame if frame<3 else 0,front_pose=(2 if frame==3 else 3 if frame==4 else 1) if kind=='acidBeetle' else 0)
 if kind=='bombBug':
  # Colobopsis-inspired ant silhouette: narrow waist and an oversized molded gaster.
  toy.ball(m,(184,63,31),(0,21,20),(18,23,16),n=24,rings=12)
  pts=[(0,21+22.8*math.sin(t),20+16*math.cos(t)+.2) for t in np.linspace(-1.15,1.3,24)]
  m.path((117,44,26),pts,.6)
  toy.ball(m,(237,171,56),(0,23,36),(3.8,5.5,1.2),n=16,rings=8)
 else:
  # A toy beetle carries a wooden ball in its two forelegs; no chemical nozzle.
  toy.ball(m,(184,163,93),(0,-12,22),(14.5,13,11.5))
  if frame != 4:
   by,bz=(-24,36) if frame==3 else (-34,26)
   toy.ball(m,(165,111,61),(0,by,bz),(7.5,7.5,7.5),n=24,rings=12,gloss=.35)
   for x in [-2.6,2.6]:
    pts=[(x,by+6.6*math.sin(t),bz+6.9*math.cos(t)) for t in np.linspace(-1.1,1.1,14)]
    m.path((117,76,41),pts,.35)
 return m
out=ROOT/'public/assets/models';manifestFile=out/'manifest.json';manifest=json.loads(manifestFile.read_text())
review=Image.new('RGB',(768,384),(223,216,196));d=ImageDraw.Draw(review)
import sys
kinds=['acidBeetle'] if '--toss-only' in sys.argv else ['bombBug'] if '--bomb-only' in sys.argv else ['bombBug','acidBeetle']
for index,kind in enumerate(kinds):
 cell=128;frames=5 if kind=='acidBeetle' else 3;sheet=Image.new('RGBA',(cell*8,cell*frames*2))
 for frame in range(frames):
  m=mesh(kind,frame)
  for a in range(16):
   tile=toy.render(m,a*math.tau/16,cell);sheet.paste(tile,((a%8)*cell,(frame*2+a//8)*cell))
   if frame==0 and a in [0,3,7]:
    q=tile.resize((256,256),Image.Resampling.LANCZOS);review.paste(q,([0,3,7].index(a)*256,index*192-24),q)
  print(kind,'pose',frame,flush=True)
 name=kind+('-2-toy-toss-v20261108.webp' if kind=='acidBeetle' else '-2-toy-v20261108.webp');sheet.save(out/name,'WEBP',quality=90,method=6,exact=True)
 manifest['models'][kind+'-2']={'body':{'file':name,'cell':128,'frames':frames,'anchorX':64,'anchorY':89.6,'directions':16,'columns':8,'walkFrames':[1,2],'walkStride':58,'design':'toy-toss-v20261108' if kind=='acidBeetle' else 'toy-special-v20261108'}}
 if kind=='acidBeetle':manifest['models'][kind+'-2']['body'].update(throwReadyFrame=3,throwFrame=4)
manifestFile.write_text(json.dumps(manifest,separators=(',',':')))
review.save(ROOT/'tools/special-insects-review.webp','WEBP',quality=93)
print('Original 16-direction toy meshes baked',flush=True)
