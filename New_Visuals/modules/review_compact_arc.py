"""Inspect downloaded artwork; only uniform scaling and review layout are applied."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parent
stem = sys.argv[1]
raw = Image.open(root / f'{stem}.png').convert('RGBA')
alpha = raw.getchannel('A')
bounds = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
assert bounds, 'No visible artwork'
art = raw.crop(bounds)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
sheet = Image.new('RGB', (760, 570), '#26313d')
draw = ImageDraw.Draw(sheet)
draw.text((20, 16), 'ARC EMITTER / proportion review', font=font, fill='white')

def tile(size, gray=False):
    sprite = art.copy()
    sprite.thumbnail((round(size * .85), round(size * .85)), Image.Resampling.LANCZOS)
    if gray:
        g = ImageOps.grayscale(sprite)
        sprite = Image.merge('RGBA', (g, g, g, sprite.getchannel('A')))
    result = Image.new('RGBA', (size, size), '#26313d')
    result.alpha_composite(sprite, ((size-sprite.width)//2, (size-sprite.height)//2))
    return result

sheet.paste(tile(480).convert('RGB'), (0, 60))
for size, y in [(64, 75), (32, 290)]:
    draw.text((490, y), f'{size}px / color and grayscale', font=font, fill='white')
    for gray, x in [(False, 495), (True, 625)]:
        sample = tile(size, gray)
        sample.save(root / f'{stem}-{size}px{"-gray" if gray else ""}.png')
        sheet.paste(sample.resize((112,112), Image.Resampling.NEAREST).convert('RGB'), (x, y+35))
draw.text((490, 510), 'Small samples enlarged', font=font, fill='#a9bacb')
sheet.save(root / f'{stem}-proportion-review.png')
stats = {'raw_size': raw.size, 'solid_bounds': bounds, 'alpha_extrema': alpha.getextrema(),
         'transparent_pixels': alpha.histogram()[0], 'opaque_pixels': alpha.histogram()[255],
         'solid_height_to_width': round(art.height/art.width, 3),
         'raw_preserved': True, 'user_approved': False}
(root / f'{stem}-inspection.json').write_text(json.dumps(stats, indent=2), encoding='utf-8')
print(json.dumps(stats))
