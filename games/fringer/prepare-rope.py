"""Make the shared periodic rope material. Requires Pillow and NumPy."""
from pathlib import Path
import colorsys
import numpy as np
from PIL import Image
root=Path(__file__).parent
src=np.array(Image.open(root/'art-source/rope-material-v2.png').convert('RGBA'))
rows=[]
for row in src:
    ids=np.where(row[:,3]>128)[0]
    u=np.linspace(ids[0]+.5,ids[-1]-.5,120)
    rows.append(np.stack([np.interp(u,np.arange(len(row)),row[:,c]) for c in range(3)],axis=1))
tex=np.array(rows);overlap=16;period=len(tex)-overlap;loop=tex[:period].copy()
for j in range(overlap):
    t=j/(overlap-1);t=t*t*(3-2*t)
    loop[j]=tex[period+j]*(1-t)+tex[j]*t
atlas=Image.new('RGB',(120*5,period))
for i,(hue,sat) in enumerate([(None,1),(.482,1),(.025,.78),(.24,.9),(.765,.7)]):
    pixels=loop.copy()
    if hue is not None:
        hsv=np.array([colorsys.rgb_to_hsv(*(c/255)) for c in loop.reshape(-1,3)])
        hsv[:,0]=hue;hsv[:,1]*=sat
        pixels=np.array([colorsys.hsv_to_rgb(*c) for c in hsv]).reshape(loop.shape)*255
    atlas.paste(Image.fromarray(np.uint8(np.clip(pixels,0,255))),(120*i,0))
atlas.save(root/'assets/rope-material-v2.png',optimize=True)
print('Prepared five 120 x152 periodic rope materials.')
