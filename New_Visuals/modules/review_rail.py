"""Review only: uniform scale and alignment; no painting or alpha repair."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

root=Path(__file__).resolve().parent
canvas=1792
centre=896
def prepare(filename,width,pivot):
    raw=Image.open(root/filename).convert('RGBA')
    alpha=raw.getchannel('A')
    bounds=alpha.point(lambda a:255 if a>=128 else 0).getbbox()
    scale=width/(bounds[2]-bounds[0])
    sprite=raw.transform((canvas,canvas),Image.Transform.AFFINE,
        (1/scale,0,pivot[0]-centre/scale,0,1/scale,pivot[1]-centre/scale),Image.Resampling.BICUBIC)
    return sprite,dict(raw_size=raw.size,solid_bounds=bounds,estimated_pivot=pivot,
        uniform_scale=scale,prepared_width=width,alpha_extrema=alpha.getextrema(),
        transparent_pixels=alpha.histogram()[0],fully_opaque_pixels=alpha.histogram()[255])

rail,audit=prepare('rail-lance-v1.png',480,(627,970))
raw=Image.open(root/'rail-lance-v1.png').convert('RGBA')
gap=raw.crop((608,230,646,620)).getchannel('A')
audit['rail_gap_alpha_extrema']=gap.getextrema()
audit['production_ready']=False
audit['note']='Estimated rear-breech pivot. Overhang allowed for rails, not body. Raw file preserved.'
base=Image.new('RGBA',(canvas,canvas))
base.paste(Image.open(root.parent/'platforms/Drift_Bastion_Platform_Square_v2.png').convert('RGBA'),(384,384))
mount=Image.new('RGBA',(canvas,canvas))
mount.paste(Image.open(root/'swivel-mount-v3-preview-layer-1024.png').convert('RGBA'),(384,384))
fixed=Image.alpha_composite(base,mount)
assembly=Image.alpha_composite(fixed,rail)
assembly.save(root/'rail-lance-v1-mounted-preview.png')
sheet=Image.new('RGB',(1200,880),'#19212b')
d=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
d.text((24,16),'RAIL LANCE — two exposed rails, shared fixed mount',font=font,fill='white')
def put(im,xy,size,gray=False):
    p=im.resize((size,size),Image.Resampling.LANCZOS)
    if gray:
        g=ImageOps.grayscale(p)
        p=Image.merge('RGBA',(g,g,g,p.getchannel('A')))
    sheet.paste(p,xy,p)
put(assembly,(5,52),640)
d.text((666,65),'64 px per platform / grayscale / 32 px',font=small,fill='white')
put(assembly,(657,103),160)
put(assembly,(826,103),160,True)
put(assembly,(1000,103),80)
d.text((665,292),'Rotation: 45 / 90 degrees (mount fixed)',font=small,fill='white')
for x,angle in [(647,45),(917,90)]:
    turned=rail.rotate(angle,resample=Image.Resampling.BICUBIC,center=(centre,centre))
    put(Image.alpha_composite(fixed,turned),(x,332),270)
d.text((665,629),'Grayscale silhouettes: cannon / Rail Lance',font=small,fill='white')
cannon,_=prepare('auto-cannon-v2.png',520,(627,750))
put(Image.alpha_composite(fixed,cannon),(690,659),135,True)
put(assembly,(867,659),135,True)
d.text((24,731),'Rails may extend beyond the cell; the breech remains on it.',font=small,fill='white')
d.text((24,811),'Design preview: uniform scaling only; estimated pivot. Raw transparency checked.',font=small,fill='#e1bd83')
d.text((24,840),'No game changes. Final alpha/material cleanup and pivot validation remain.',font=small,fill='#e1bd83')
sheet.save(root/'rail-lance-v1-review.png')
(root/'rail-lance-v1-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print(json.dumps(audit))
