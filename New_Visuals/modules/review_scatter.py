"""Uniformly position raw Scatter artwork above the existing platform and bearing."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent
stem = sys.argv[1]
pivot = tuple(map(float, sys.argv[2:4]))
width = int(sys.argv[4]) if len(sys.argv) > 4 else 500
raw = Image.open(root / f'{stem}.png').convert('RGBA')
orientation = int(sys.argv[5]) if len(sys.argv) > 5 else 0
body_start_x = int(sys.argv[6]) if len(sys.argv) > 6 else None
assert orientation in (0,90,180,270), 'Use exact quarter-turns for orientation only'
if orientation:
    raw = raw.rotate(orientation,expand=True)
alpha = raw.getchannel('A')
solid = alpha.point(lambda a: 255 if a >= 128 else 0)
bounds = solid.getbbox()
scale = width / (bounds[2] - bounds[0])
radius = max(((x-pivot[0])**2+(y-pivot[1])**2)**.5
             for y in range(bounds[1],bounds[3])
             for x in range(bounds[0],bounds[2]) if solid.getpixel((x,y))) * scale
body_radius = radius
if body_start_x is not None:
    assert orientation == 0, 'Body cutoff is defined in the raw left-facing image'
    body_radius = max(((x-pivot[0])**2+(y-pivot[1])**2)**.5
        for y in range(bounds[1],bounds[3])
        for x in range(body_start_x,bounds[2]) if solid.getpixel((x,y))) * scale
assert body_radius < 358, 'Body extends beyond cell rotation envelope'
assert radius < 512, 'Artwork would clip in the review canvas'
layer = raw.transform((1024,1024), Image.Transform.AFFINE,
    (1/scale,0,pivot[0]-512/scale,0,1/scale,pivot[1]-512/scale), Image.Resampling.BICUBIC)
base = Image.open(root.parent / 'platforms/Drift_Bastion_Platform_Square_v2.png').convert('RGBA')
mount = Image.open(root / 'swivel-mount-v3-preview-layer-1024.png').convert('RGBA')
fixed = Image.alpha_composite(base,mount)
assembly = Image.alpha_composite(fixed,layer)
layer.save(root / f'{stem}-preview-layer-1024.png')
assembly.save(root / f'{stem}-mounted-preview.png')
sheet = Image.new('RGB',(960,660),'#26313d')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
subtitle = {
    'scatter-array-v1': 'short fan of barrels',
    'scatter-array-v2': 'compact double-barrel shotgun',
    'scatter-array-v3': 'compact double-barrel shotgun',
    'scatter-array-v4': 'compact double-barrel shotgun',
    'scatter-array-v5': 'single wide-bore shotgun',
    'scatter-array-v16': 'heavy shotgun / receiver concept',
    'scatter-array-v17': 'heavy shotgun / short fore-end',
    'scatter-array-v18': 'shotgun / rotary ammo magazine',
    'scatter-array-v19': 'shotgun / enclosed ammo drum',
    'scatter-array-v20': 'shotgun / separate ammo boxes',
    'scatter-array-v21': 'shotgun / revised central breech',
    'scatter-array-v23': 'shotgun / continuous center housing',
    'scatter-array-v24': 'shotgun / full barrel redesign',
    'scatter-array-v25': 'shotgun / overhead projection correction',
    'scatter-array-v26': 'shotgun / hidden muzzle face',
    'scatter-array-v27': 'shotgun / wide cyan tip',
    'scatter-array-v28': 'shotgun / selected reference tip',
    'flak-battery-v2': 'twin-barrel interception turret',
    'flak-battery-v3': 'rotary gun / ammo housing / rear scanner',
}.get(stem, 'energy disc launcher')
asset_title = 'FLAK BATTERY' if stem.startswith('flak-battery-') else 'SCATTER ARRAY'
draw.text((24,18),f'{asset_title} / {subtitle}',font=font,fill='white')

def cell(image, size, gray=False):
    if body_start_x is None:
        result = image.crop((154,154,870,870)).resize((size,size),Image.Resampling.LANCZOS)
    else:
        # Preserve barrel overhang while the 716px platform spans exactly size pixels.
        extent = round(size * 1024 / 716)
        result = image.transform((extent,extent),Image.Transform.AFFINE,
            (716/size,0,0,0,716/size,0),Image.Resampling.BICUBIC)
    if gray:
        g = ImageOps.grayscale(result)
        result = Image.merge('RGBA',(g,g,g,result.getchannel('A')))
    return result

def place(image,xy):
    sheet.paste(image,xy,image)

place(cell(assembly,356 if body_start_x is not None else 510),(25,75))
draw.text((580,65),'64px cell / grayscale',font=small,fill='white')
draw.text((580,245),'32px cell / grayscale',font=small,fill='white')
for size,y in [(64,100),(32,280)]:
    for gray,x in [(False,585),(True,760)]:
        sample = cell(assembly,size,gray)
        sample.save(root/f'{stem}-{size}px{"-gray" if gray else ""}.png')
        place(sample.resize((128,128),Image.Resampling.NEAREST),(x,y))
draw.text((580,440),'45 degrees / fixed bearing',font=small,fill='white')
turned = layer.rotate(45,resample=Image.Resampling.BICUBIC,center=(512,512))
place(cell(Image.alpha_composite(fixed,turned),102 if body_start_x is not None else 145),(665,470))
draw.text((25,622),'Design preview. Shared platform + bearing; estimated pivot. Small samples enlarged.',font=small,fill='#b7c7d8')
sheet.save(root/f'{stem}-review.png')
audit = dict(raw_size=raw.size, alpha_extrema=alpha.getextrema(),
             transparent_pixels=alpha.histogram()[0], solid_bounds=bounds,
             estimated_pivot=pivot, uniform_scale=scale, solid_radius=radius,
             preview_rotation_degrees=orientation,
             body_radius=body_radius, body_start_x=body_start_x,
             fits_all_rotations=radius<358, body_fits_all_rotations=body_radius<358,
             barrel_overhang_allowed=body_start_x is not None, production_ready=False,
             raw_preserved=True)
(root/f'{stem}-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print(json.dumps(audit))
