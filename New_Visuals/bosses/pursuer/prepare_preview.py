"""Measure raw candidates and prepare a proportional, centered review export."""
import hashlib
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
THRESHOLD = 16
audit = {"chat": "https://chatgpt.com/c/6acf3000-b0d0-83eb-9fc5-b24788abbceb", "candidates": {}}
for source in sorted((ROOT / "raw").glob("pursuer-v*.png")):
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    visible = alpha.point(lambda value: 255 if value >= THRESHOLD else 0)
    bounds = visible.getbbox()
    audit["candidates"][source.name] = {
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "dimensions": list(image.size),
        "mode": image.mode,
        "alpha_range": list(alpha.getextrema()),
        "raw_alpha_bounds": list(alpha.getbbox()),
        "visible_alpha_bounds": list(bounds),
        "visible_threshold": THRESHOLD,
        "transparent_fraction": alpha.histogram()[0] / (image.width * image.height),
    }

source = ROOT / "raw" / "pursuer-v2.png"
image = Image.open(source).convert("RGBA")
visible = image.getchannel("A").point(lambda value: 255 if value >= THRESHOLD else 0)
left, top, right, bottom = visible.getbbox()
center = ((left + right) / 2, (top + bottom) / 2)
pixels = visible.load()
radius = max(math.hypot(x - center[0], y - center[1])
             for y in range(top, bottom) for x in range(left, right) if pixels[x, y])
half = math.ceil(radius + 16)
square = Image.new("RGBA", (half * 2, half * 2))
crop = image.crop((left, top, right, bottom))
square.paste(crop, (round(half + left - center[0]), round(half + top - center[1])))
technical = ROOT / "technical"
technical.mkdir(exist_ok=True)
square.resize((256, 256), Image.Resampling.LANCZOS).save(technical / "pursuer-v2-256.png")

def anchor(x, y):
    return [round((x - center[0]) * 128 / half, 3),
            round((y - center[1]) * 128 / half, 3)]

preview = {
    "source": "technical/pursuer-v2-256.png",
    "size": 256,
    "anchors": {"leftEngine": anchor(404, 1115), "rightEngine": anchor(850, 1115),
                "core": anchor(627, 435), "emitter": anchor(627, 310)},
}
(technical / "preview-data.js").write_text(
    "window.PursuerPreviewData = " + json.dumps(preview, indent=2) + ";\n", encoding="utf-8")
audit["technical_export"] = {
    "source": str(source.relative_to(ROOT)), "output": "technical/pursuer-v2-256.png",
    "crop": [left, top, right, bottom], "source_pivot": list(center),
    "source_radius": radius, "square_size": half * 2, "output_size": 256,
    "processing": "Crop exterior near-transparent specks, center by visible bounds, pad to contain the circular footprint, proportional Lanczos downsample. Raw sources unchanged.",
}
(ROOT / "audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"visible_bounds": [left, top, right, bottom], "source_radius": round(radius, 2),
                  "export_size": 256, "raw_preserved": True}))
