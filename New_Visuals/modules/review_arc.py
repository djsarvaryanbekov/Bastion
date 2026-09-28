"""Arc design review: uniform scaling/compositing only; raw artwork unchanged."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
version = sys.argv[1] if len(sys.argv) > 1 else 'v1'
stem = f'arc-emitter-{version}'
raw = Image.open(ROOT / f'{stem}.png').convert('RGBA')
alpha = raw.getchannel('A')
bounds = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
pivot = tuple(map(float, sys.argv[2:4])) if len(sys.argv) >= 4 else (627, 700)
target_width = int(sys.argv[4]) if len(sys.argv) >= 5 else 500
# Estimated design-review pivot, not production metadata.
scale = target_width / (bounds[2] - bounds[0])
radius = max(((x-pivot[0])**2 + (y-pivot[1])**2)**0.5
             for y in range(bounds[1], bounds[3])
             for x in range(bounds[0], bounds[2]) if alpha.getpixel((x, y)) >= 128) * scale
assert radius < 358, 'Solid body must fit the cell at every rotation.'
layer = raw.transform((1024, 1024), Image.Transform.AFFINE,
    (1/scale, 0, pivot[0]-512/scale, 0, 1/scale, pivot[1]-512/scale), Image.Resampling.BICUBIC)
layer.save(ROOT / f'{stem}-preview-layer-1024.png')
base = Image.open(ROOT.parent / 'platforms/Drift_Bastion_Platform_Square_v2.png').convert('RGBA')
mount = Image.open(ROOT / 'swivel-mount-v3-preview-layer-1024.png').convert('RGBA')
fixed = Image.alpha_composite(base, mount)
assembly = Image.alpha_composite(fixed, layer)
assembly.save(ROOT / f'{stem}-mounted-preview.png')
sheet = Image.new('RGB', (1200, 900), '#19212b')
draw = ImageDraw.Draw(sheet)
title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 29)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
draw.text((26, 20), 'ARC EMITTER', font=title, fill='white')
subtitle = ('Short curved electrodes / open discharge gap' if version == 'v1'
            else 'Solid discharge head / insulated neck / power housing')
if version in ('v4', 'v5', 'v6'):
    subtitle = 'Tesla coil / circular top terminal / compact power chassis'
if version == 'v6':
    subtitle = 'Horizontal Tesla coil / graduated circular cone'
draw.text((26, 58), subtitle, font=font, fill='#afbdcc')

def put(im, xy, size, gray=False):
    p = im.resize((size, size), Image.Resampling.LANCZOS)
    if gray:
        g = ImageOps.grayscale(p)
        p = Image.merge('RGBA', (g, g, g, p.getchannel('A')))
    sheet.paste(p, xy, p)

put(assembly, (0, 100), 620)
draw.text((645, 110), '64 px cell        Grayscale        32 px cell', font=font, fill='white')
put(assembly, (650, 158), 92)
put(assembly, (803, 158), 92, True)
put(assembly, (979, 181), 46)
draw.text((645, 298), '45 / 90 degrees — fixed mount underneath', font=font, fill='white')
for x, angle in [(620, 45), (894, 90)]:
    turned = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=(512, 512))
    put(Image.alpha_composite(fixed, turned), (x, 350), 270)

draw.text((26, 704), 'Same scale / grayscale:', font=font, fill='white')
for x, label in [(310, 'Rail Lance'), (555, 'Piercing Laser'), (821, 'Arc Emitter')]:
    draw.text((x, 704), label, font=font, fill='white')
put(Image.open(ROOT / 'rail-lance-v1-mounted-preview.png').convert('RGBA'), (275, 733), 160, True)
put(Image.open(ROOT / 'piercing-laser-v2-mounted-preview.png').convert('RGBA'), (532, 733), 160, True)
put(assembly, (823, 767), 92, True)
draw.text((26, 872), 'Design candidate. Uniform scaling only; material/alpha cleanup and precise pivot remain.', font=font, fill='#d2ba91')
sheet.save(ROOT / f'{stem}-review.png')
audit = dict(raw_size=raw.size, solid_bounds=bounds, alpha_extrema=alpha.getextrema(),
    transparent_pixels=alpha.histogram()[0], fully_opaque_pixels=alpha.histogram()[255],
    estimated_pivot=pivot, uniform_scale=scale, width=target_width, solid_radius=radius,
    fits_all_rotations=radius < 358,
    production_ready=False, raw_preserved=True)
if version == 'v1':
    audit['gap_alpha_extrema'] = alpha.crop((580,260,675,475)).getextrema()
(ROOT / f'{stem}-audit.json').write_text(json.dumps(audit, indent=2), encoding='utf-8')
print(json.dumps(audit))
