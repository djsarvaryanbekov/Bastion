"""Composite independent generated mount and unchanged launcher; no repainting."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent
mount_version=sys.argv[1] if len(sys.argv)>1 else 'v2'
base=Image.open(root.parent/'platforms/Drift_Bastion_Platform_Square_v2.png').convert('RGBA')

def layer(filename, width, pivot=None):
    raw=Image.open(root/filename).convert('RGBA')
    alpha=raw.getchannel('A')
    bounds=alpha.point(lambda a:255 if a>=128 else 0).getbbox()
    center=pivot or ((bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2)
    scale=width/(bounds[2]-bounds[0])
    result=raw.transform((1024,1024),Image.Transform.AFFINE,
        (1/scale,0,center[0]-512/scale,0,1/scale,center[1]-512/scale),Image.Resampling.BICUBIC)
    return result,dict(raw_file=filename,raw_size=raw.size,solid_bounds=bounds,
        alpha_extrema=alpha.getextrema(),transparent_pixels=alpha.histogram()[0],
        estimated_source_center=center,uniform_scale=scale,prepared_width=width)

weapon,wa=layer('missile-pod-v5.png',579,(627.5,676.5))
mount,ma=layer(f'swivel-mount-{mount_version}.png',320)
mount.save(root/f'swivel-mount-{mount_version}-preview-layer-1024.png')
weapon.save(root/'missile-pod-v5-preview-layer-1024.png')
fixed=Image.alpha_composite(base,mount)
assembly=Image.alpha_composite(fixed,weapon)
assembly.save(root/f'missile-pod-v5-mount-{mount_version}-preview-1024.png')
sheet=Image.new('RGB',(1100,820),'#19212b')
d=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
d.text((24,16),'COMPACT MISSILE POD + SEPARATE SWIVEL MOUNT',font=font,fill='white')
def put(im,xy,size,crop=True):
    if crop: im=im.crop((154,154,870,870))
    p=im.resize((size,size),Image.Resampling.LANCZOS)
    sheet.paste(p,xy,p)
put(assembly,(24,62),510)
d.text((564,64),'Separate mount layer',font=small,fill='white')
put(mount,(570,92),170)
d.text((770,64),'Platform + fixed mount',font=small,fill='white')
put(fixed,(788,92),170)
d.text((560,285),'Only the launcher rotates: 45 / 90 degrees',font=small,fill='white')
for x,angle in [(560,45),(810,90)]:
    rotated=weapon.rotate(angle,resample=Image.Resampling.BICUBIC,center=(512,512))
    put(Image.alpha_composite(fixed,rotated),(x,317),225)
d.text((24,600),'Gameplay size: 64 px / 32 px per platform',font=small,fill='white')
put(assembly,(24,632),64)
put(assembly,(112,632),32)
d.text((225,645),'Layer order: platform > fixed bearing > rotating launcher',font=small,fill='#c4d1df')
d.text((225,677),'Launcher artwork unchanged; uniform resize / alignment only.',font=small,fill='#c4d1df')
d.text((24,741),'Design preview. Separate RGBA layers; estimated pivots. Raw generation preserved.',font=small,fill='#e1bd83')
d.text((24,769),'Final alpha/material cleanup still pending. No game integration.',font=small,fill='#e1bd83')
sheet.save(root/f'missile-pod-mounted-{mount_version}-review.png')
report=dict(weapon=wa,mount=ma,layer_order=['platform','fixed mount','rotating launcher'],production_ready=False)
(root/f'mount-{mount_version}-layer-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
