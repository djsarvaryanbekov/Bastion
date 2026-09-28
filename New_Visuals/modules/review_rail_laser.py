"""Comparison only: uniform scaling and compositing, no artwork repainting."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
CANVAS = 1792
CENTER = CANVAS / 2

def prepare(filename, width, pivot):
    raw = Image.open(ROOT / filename).convert('RGBA')
    alpha = raw.getchannel('A')
    bounds = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
    scale = width / (bounds[2] - bounds[0])
    layer = raw.transform((CANVAS, CANVAS), Image.Transform.AFFINE,
        (1 / scale, 0, pivot[0] - CENTER / scale,
         0, 1 / scale, pivot[1] - CENTER / scale), Image.Resampling.BICUBIC)
    return layer, dict(file=filename, raw_size=raw.size, solid_bounds=bounds,
        estimated_pivot=pivot, uniform_scale=scale, prepared_width=width,
        alpha_extrema=alpha.getextrema(), transparent_pixels=alpha.histogram()[0],
        fully_opaque_pixels=alpha.histogram()[255], production_ready=False)

version = sys.argv[1] if len(sys.argv) > 1 else 'v2'
laser_pivot = tuple(map(float, sys.argv[2:4]))
if len(laser_pivot) != 2:
    raise SystemExit('Supply estimated source pivot x and y after version.')
rail, rail_audit = prepare('rail-lance-v1.png', 480, (627, 970))
laser, laser_audit = prepare(f'piercing-laser-{version}.png', 520, laser_pivot)
fixed = Image.new('RGBA', (CANVAS, CANVAS))
platform = Image.open(ROOT.parent / 'platforms/Drift_Bastion_Platform_Square_v2.png').convert('RGBA')
fixed.alpha_composite(platform, (384, 384))
fixed.alpha_composite(Image.open(ROOT / 'swivel-mount-v3-preview-layer-1024.png').convert('RGBA'), (384, 384))
assemblies = [Image.alpha_composite(fixed, weapon) for weapon in (rail, laser)]
assemblies[1].save(ROOT / f'piercing-laser-{version}-mounted-preview.png')

sheet = Image.new('RGB', (1320, 920), '#19212b')
draw = ImageDraw.Draw(sheet)
title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 29)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)

def put(sprite, xy, size, gray=False):
    preview = sprite.resize((size, size), Image.Resampling.LANCZOS)
    if gray:
        g = ImageOps.grayscale(preview)
        preview = Image.merge('RGBA', (g, g, g, preview.getchannel('A')))
    sheet.paste(preview, xy, preview)

for column, (assembly, name, subtitle) in enumerate(zip(assemblies,
        ['RAIL LANCE', 'PIERCING LASER'],
        ['Two exposed rails / open gap', 'Single enclosed emitter / broad housing'])):
    x = column * 660
    draw.text((x + 30, 22), name, font=title, fill='white')
    draw.text((x + 30, 60), subtitle, font=small, fill='#afbdcc')
    put(assembly, (x + 10, 92), 640)
    # Platform occupies 716 / 1792 of each full canvas: 160 gives 64 px/cell.
    draw.text((x + 32, 674), '64 px cell', font=small, fill='white')
    draw.text((x + 235, 674), '64 px / grayscale', font=small, fill='white')
    draw.text((x + 463, 674), '32 px cell', font=small, fill='white')
    put(assembly, (x + 22, 700), 160)
    put(assembly, (x + 248, 700), 160, True)
    put(assembly, (x + 467, 740), 80)
draw.line((660, 22, 660, 860), fill='#35414e', width=1)
draw.text((30, 887), 'Same platform scale and fixed mount. Design candidates; no local repainting or game changes.',
          font=small, fill='#d2ba91')
sheet.save(ROOT / f'rail-vs-laser-{version}-review.png')
(ROOT / f'rail-vs-laser-{version}-audit.json').write_text(json.dumps(
    dict(rail=rail_audit, laser=laser_audit, platform_width=716,
         preview_only=True, note='Uniform scale only; pivots estimated for design review.'), indent=2), encoding='utf-8')
print(json.dumps(laser_audit))
