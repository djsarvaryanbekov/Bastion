"""Review only: uniform scale and translation around visually estimated pivots.

Raw images remain untouched. No recoloring, alpha repair or creative redraw.
"""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
PLATFORM = ROOT.parent / 'platforms/Drift_Bastion_Platform_Square_v2.png'
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)

def prepare(filename, pivot, body_top=0):
    raw = Image.open(ROOT / filename).convert('RGBA')
    alpha = raw.getchannel('A')
    solid = alpha.point(lambda a: 255 if a >= 128 else 0)
    bounds = solid.getbbox()
    points = [(x, y) for y in range(raw.height) for x in range(raw.width)
              if y >= body_top and solid.getpixel((x, y))]
    radius = max(math.hypot(x-pivot[0], y-pivot[1]) for x,y in points)
    scale = 285 / radius
    layer = raw.transform((1536,1536), Image.Transform.AFFINE,
        (1/scale,0,pivot[0]-768/scale,0,1/scale,pivot[1]-768/scale),
        Image.Resampling.BICUBIC)
    hist = alpha.histogram()
    audit = dict(raw=filename, dimensions=list(raw.size), alpha_bbox=alpha.getbbox(),
        solid_bbox=bounds, transparent_pixels=hist[0], opaque_pixels=hist[255],
        estimated_source_pivot=pivot, preview_uniform_scale=scale, body_region_top=body_top,
        note='Pivot is visually estimated, NOT verified production metadata. Preview only.')
    return layer, audit

def main():
    specs = [('Auto Cannon — original barrel','auto-cannon-v1.png',(627,780),500),
             ('Auto Cannon — shorter variant','auto-cannon-v2.png',(627,750),500),
             ('Missile Pod','missile-pod-v1.png',(627,695),0)]
    sheet = Image.new('RGB',(1670,940),'#171e27')
    draw = ImageDraw.Draw(sheet)
    draw.text((24,15),'WEAPON CANDIDATES — same fixed platform, estimated pivots',font=FONT,fill='white')
    base = Image.new('RGBA',(1536,1536))
    base.paste(Image.open(PLATFORM).convert('RGBA'),(256,256))
    audits=[]
    for column,(name,filename,pivot,body_top) in enumerate(specs):
        x=20+column*550
        layer,audit=prepare(filename,pivot,body_top)
        audits.append(audit)
        draw.text((x,52),name,font=FONT,fill='white')
        assembly=Image.alpha_composite(base,layer)
        large=assembly.resize((500,500),Image.Resampling.LANCZOS)
        sheet.paste(large,(x,78),large)
        draw.text((x,580),'Cell footprint: 64 px / 32 px / grayscale 64 px',font=SMALL,fill='#b5c3d3')
        for offset,size,gray in [(0,64,False),(155,32,False),(240,64,True)]:
            side=round(1536*size/716)
            small=assembly.resize((side,side),Image.Resampling.LANCZOS)
            if gray:
                small=Image.merge('RGBA',(*([ImageOps.grayscale(small)]*3),small.getchannel('A')))
            sheet.paste(small,(x+offset,602),small)
        draw.text((x,741),'Body fits cell; barrel overhang is allowed. 0 / 45 / 90 deg',font=SMALL,fill='#b5c3d3')
        for idx,angle in enumerate((0,45,90)):
            rotated=layer.rotate(angle,resample=Image.Resampling.BICUBIC,center=(768,768))
            part=Image.alpha_composite(base,rotated).resize((145,145),Image.Resampling.LANCZOS)
            sheet.paste(part,(x+idx*160,761),part)
    draw.text((24,915),'Preview: uniform resize + translation only. Pivots estimated. Raw PNGs preserved; alpha/material cleanup still pending.',font=SMALL,fill='#e5bd79')
    sheet.save(ROOT/'weapon-review.png')
    (ROOT/'weapon-audit.json').write_text(json.dumps(audits,indent=2),encoding='utf-8')

if __name__=='__main__':
    main()
