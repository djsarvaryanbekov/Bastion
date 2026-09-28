"""Create an honest assembly preview without altering the raw candidate."""
from pathlib import Path
import json
import math
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent
version = sys.argv[1]
raw = Image.open(root / f'missile-pod-{version}.png').convert('RGBA')
alpha = raw.getchannel('A')
mask = alpha.point(lambda value: 255 if value >= 128 else 0)
bounds = mask.getbbox()
# The symmetric covered body has a concealed bearing. This is a review pivot,
# not a claim that the generated file contains validated attachment metadata.
pivot = ((bounds[0]+bounds[2])/2, (bounds[1]+bounds[3])/2)
radius = max(math.hypot(x-pivot[0],y-pivot[1])
    for y in range(bounds[1],bounds[3]) for x in range(bounds[0],bounds[2])
    if mask.getpixel((x,y)))
scale = 340/radius
# Optional mounted width keeps proportion comparisons at the previous scale.
if len(sys.argv) > 2:
    scale = float(sys.argv[2]) / (bounds[2]-bounds[0])
layer = raw.transform((1024,1024),Image.Transform.AFFINE,
    (1/scale,0,pivot[0]-512/scale,0,1/scale,pivot[1]-512/scale),Image.Resampling.BICUBIC)
platform = Image.open(root.parent/'platforms/Drift_Bastion_Platform_Square_v2.png').convert('RGBA')
assembly = Image.alpha_composite(platform,layer)
tile = assembly.crop((154,154,870,870))
sheet = Image.new('RGB',(1060,760),'#19212b')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
draw.text((24,18),'MISSILE POD — covered housing candidate',font=font,fill='white')
large=tile.resize((500,500),Image.Resampling.LANCZOS)
sheet.paste(large,(24,68),large)
draw.text((560,70),'Actual cell scale: 64 px / 32 px',font=small,fill='white')
for x,size,gray in [(560,64,False),(662,32,False),(756,64,True)]:
    preview=tile.resize((size,size),Image.Resampling.LANCZOS)
    if gray:
        preview=Image.merge('RGBA',(*([ImageOps.grayscale(preview)]*3),preview.getchannel('A')))
    sheet.paste(preview,(x,115),preview)
draw.text((560,212),'Same mount rotated 45 and 90 degrees',font=small,fill='white')
for x,angle in [(560,45),(792,90)]:
    rotated=layer.rotate(angle,resample=Image.Resampling.BICUBIC,center=(512,512))
    image=Image.alpha_composite(platform,rotated).crop((154,154,870,870)).resize((220,220),Image.Resampling.LANCZOS)
    sheet.paste(image,(x,248),image)
draw.text((24,610),'Metal covers hide missile bodies; only short forward tips remain visible.',font=font,fill='white')
draw.text((24,660),'Preview only: uniform scaling + centering. Concealed pivot estimated.',font=small,fill='#e1bd83')
draw.text((24,690),'Raw generation preserved. Not yet an approved production export.',font=small,fill='#e1bd83')
sheet.save(root/f'missile-pod-{version}-review.png')
hist=alpha.histogram()
report=dict(version=version,raw_size=raw.size,alpha_range=alpha.getextrema(),
    transparent=hist[0],fully_opaque=hist[255],solid_bounds=bounds,
    estimated_pivot=pivot,preview_uniform_scale=scale,preview_radius=radius*scale,
    note='Raw image unmodified. Concealed pivot estimated for review only.')
(root/f'missile-pod-{version}-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
