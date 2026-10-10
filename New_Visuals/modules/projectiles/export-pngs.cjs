// Run from any directory: node New_Visuals/modules/projectiles/export-pngs.cjs
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const inkscape = process.env.INKSCAPE_PATH || 'C:/Program Files/Inkscape/bin/inkscape.com';
const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'artwork-manifest.json'), 'utf8'));
fs.mkdirSync(path.join(root, 'png'), { recursive: true });

for (const asset of manifest.assets) {
  const result = spawnSync(inkscape, [
    path.join(root, asset.svg),
    '--export-area-page',
    '--export-background-opacity=0',
    `--export-width=${asset.viewBox[2] * manifest.exportScale}`,
    `--export-filename=${path.join(root, asset.png)}`,
  ], { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error(`${asset.module}: ${result.error?.message || result.stderr || result.stdout}`);
  }
  if (!fs.existsSync(path.join(root, asset.png))) throw new Error(`Missing PNG: ${asset.png}`);
  console.log(`Exported ${asset.png}`);
}
