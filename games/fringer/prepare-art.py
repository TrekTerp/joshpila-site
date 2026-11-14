"""Slice the approved sheet and register its rope ports for the game's geometry.
Pure asset preparation; neither game rules nor the original source image are changed.
Requires Pillow and NumPy. Output coordinates are in the atlas, not game state.
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).parent
SOURCE=ROOT/'art-source/evolved-pack-v1.png'
im=np.array(Image.open(SOURCE).convert('RGBA'))
assert im.shape==(1254,1254,4), 'Review registration if the art source changes.'
# The generator left almost-transparent color-key noise (alpha 1-5). Remove that
# empty fringe; normalize its opaque interiors, whose alpha plateaus around 253.
a=im[:,:,3].astype(float)
im[:,:,3]=np.clip((a-8)*255/245,0,255).astype('uint8')
im[im[:,:,3]==0,:3]=0
pieces={}; meta={}

def cell(row,col):
    out=im[row*209:(row+1)*209,col*209:(col+1)*209].copy()
    if row==1: out[:25]=0 # Exclude spill from the straight tile above.
    return out

def bounds(arr):
    yy,xx=np.where(arr[:,:,3]>80)
    return int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)

def trim(arr,pad=2):
    l,t,r,b=bounds(arr)
    l=max(0,l-pad);t=max(0,t-pad);r=min(arr.shape[1],r+pad);b=min(arr.shape[0],b+pad)
    return arr[t:b,l:r].copy()

def sample(arr,xx,yy):
    xx=np.clip(xx,0,arr.shape[1]-1);yy=np.clip(yy,0,arr.shape[0]-1)
    x0=np.floor(xx).astype(int);y0=np.floor(yy).astype(int)
    x1=np.minimum(x0+1,arr.shape[1]-1);y1=np.minimum(y0+1,arr.shape[0]-1)
    fx=(xx-x0)[...,None];fy=(yy-y0)[...,None]
    # Premultiplied interpolation prevents black/colored halos at transparent edges.
    work=arr.astype(float)/255;work[:,:,:3]*=work[:,:,3:4]
    out=(work[y0,x0]*(1-fx)+work[y0,x1]*fx)*(1-fy)+(work[y1,x0]*(1-fx)+work[y1,x1]*fx)*fy
    np.divide(out[:,:,:3],out[:,:,3:4],out=out[:,:,:3],where=out[:,:,3:4]>0)
    return np.clip(out*255,0,255).astype('uint8')

def rope_profile(arr):
    valid=np.sum(arr[:,:,3]>140,axis=1)>10
    rows=np.where(valid)[0]
    lo,hi=int(rows[0]+2),int(rows[-1]-2)
    centers=[];widths=[]
    for yy in range(lo,hi+1):
        xs=np.where(arr[yy,:,3]>100)[0]
        centers.append((xs[0]+xs[-1])/2);widths.append(xs[-1]-xs[0]+1)
    return np.arange(lo,hi+1),np.array(centers),np.array(widths)

for color in range(5):
    # Straight textures retain the painted braid; same normalized neck width as curves.
    arr=cell(0,color);ys,cx,ww=rope_profile(arr)
    yy,xx=np.mgrid[0:256,0:40]
    sy=ys[0]+yy/255*(ys[-1]-ys[0]);center=np.interp(sy,ys,cx);width=np.interp(sy,ys,ww)
    tex=sample(arr,center+(xx-19.5)/32*width,sy)
    # Blend one braid period at the repeat boundary, preserving the texture body.
    for j in range(10):
        t=j/9
        blend=((tex[-10+j].astype(float)+tex[j].astype(float))/2).astype('uint8')
        tex[j]=((1-t)*blend+t*tex[j]).astype('uint8')
        tex[-10+j]=((1-t)*tex[-10+j]+t*blend).astype('uint8')
    pieces[f'straight{color}']=Image.fromarray(tex)
    for direction,row in [(1,1),(-1,2)]:
        arr=cell(row,color);ys,cx,ww=rope_profile(arr)
        for gap in [76,71.25,570/9]:
            half=39.375*.44;rope_width=15;pad=12;scale=3
            width=int(np.ceil((gap+pad*2)*scale));height=int(np.ceil(half*2*scale))
            yy,xx=np.mgrid[0:height,0:width];v=(yy+.5)/height
            ts=np.linspace(0,1,2001)
            # Same cubic centerline as Classic; the projection fits the approved
            # curved texture to it, rather than stretching a full crossing image.
            yts=3*(1-ts)**2*ts*.375+3*(1-ts)*ts**2*.625+ts**3
            t=np.interp(v,yts,ts)
            center=pad+gap*(3*t*t-2*t*t*t)
            dx=gap*6*t*(1-t)
            ddy=(3*(1-t)**2*.375+6*(1-t)*t*.25+3*t*t*.375)*(half*2)
            if direction==-1:center=pad+gap-(center-pad)
            crosswidth=rope_width*np.sqrt(1+(dx/ddy)**2)
            sy=ys[0]+v*(ys[-1]-ys[0]);sc=np.interp(sy,ys,cx);sw=np.interp(sy,ys,ww)
            sx=sc+((xx+.5)/scale-center)/crosswidth*sw
            out=sample(arr,sx,sy)
            pieces[f'curve{direction}_{color}_{gap:.2f}']=Image.fromarray(out)
    socket=cell(3,color);l,t,r,b=bounds(socket)
    pieces[f'socket{color}']=Image.fromarray(socket[max(0,t-2):t+118,max(0,l-2):r+2])
    tassel=cell(4,color);l,t,r,b=bounds(tassel)
    cropped=tassel[b-82:b+2,max(0,l-2):r+2]
    neck=np.where(cropped[2,:,3]>140)[0]
    meta[f'tassel{color}']={'anchor':float((neck[0]+neck[-1])/2),'neck':int(neck[-1]-neck[0]+1)}
    pieces[f'tassel{color}']=Image.fromarray(cropped)
for row,name in enumerate(['cursor1','cursor-1','spark','burst','turn']):
    pieces[name]=Image.fromarray(trim(cell(row,5)))
for col,name in enumerate(['woodL','woodM','woodR','combL','combM','combR']):
    pieces[name]=Image.fromarray(trim(cell(5,col),0))
# Registration for beam joins measured from their straight top and bottom edges.
for name,midtop,midbottom in [('woodL',22,108),('woodM',0,86),('woodR',22,108),('combL',23,99),('combM',0,76),('combR',23,99)]:
    meta[name]={'joinTop':midtop,'joinBottom':midbottom}
# Pack with gutters to prevent sampling adjacent sprites.
AW=1024;x=y=4;rowh=0;positions={}
for name,piece in pieces.items():
    if x+piece.width+4>AW:x=4;y+=rowh+8;rowh=0
    positions[name]={'x':x,'y':y,'w':piece.width,'h':piece.height,**meta.get(name,{})}
    x+=piece.width+8;rowh=max(rowh,piece.height)
atlas=Image.new('RGBA',(AW,y+rowh+4))
for name,piece in pieces.items():atlas.paste(piece,(positions[name]['x'],positions[name]['y']))
path=ROOT/'assets/evolved-atlas-v1.webp';atlas.save(path,format='WEBP',quality=92,method=6,exact=True)
icon=pieces['turn'].copy();icon.thumbnail((80,80),Image.Resampling.LANCZOS);icon.save(ROOT/'assets/turn-bonus-v1.png',optimize=True)
data={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'image':'assets/evolved-atlas-v1.webp','sprites':positions}
(ROOT/'assets/evolved-atlas-v1.json').write_text(json.dumps(data,indent=2)+'\n')
(ROOT/'src/art-data.js').write_text('/* Generated by prepare-art.py. */\nconst FRINGER_ART = '+json.dumps(data,indent=2)+';\n')
print(f'Packed {len(pieces)} registered sprites into {atlas.size}, {path.stat().st_size:,} bytes')
