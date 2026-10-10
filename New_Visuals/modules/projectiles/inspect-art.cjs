// Inspect exported artwork in an isolated browser; does not open or change the game.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = __dirname;
const workspace = path.resolve(root, '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'artwork-manifest.json'), 'utf8'));
const output = path.join(root, 'qa');
fs.mkdirSync(output, { recursive: true });

async function main() {
  const mime = { '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((request, response) => {
    const filename = path.resolve(workspace, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    if (!filename.startsWith(`${workspace}${path.sep}`)) { response.writeHead(403).end(); return; }
    fs.readFile(filename, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      response.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
      response.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const base = `http://127.0.0.1:${server.address().port}/New_Visuals/modules/projectiles/`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}review-v1.html`);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    const results = await page.evaluate(async ({ assets, exportScale }) => {
      const results = [];
      for (const asset of assets) {
        const source = await fetch(asset.svg).then(response => response.text());
        const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
        if (xml.querySelector('parsererror')) throw new Error(`Invalid SVG: ${asset.svg}`);
        if (xml.querySelector('script,foreignObject,image')) throw new Error(`Unexpected embedded content: ${asset.svg}`);
        const image = new Image();
        image.src = asset.png;
        await image.decode();
        const [,,width,height] = asset.viewBox;
        if (image.width !== width * exportScale || image.height !== height * exportScale) throw new Error(`Export dimensions: ${asset.module}`);
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let minAlpha = 255, maxAlpha = 0, edgeAlpha = 0, paintedPixels = 0;
        const bounds = [canvas.width, canvas.height, -1, -1];
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          minAlpha = Math.min(minAlpha, alpha);
          maxAlpha = Math.max(maxAlpha, alpha);
          if (x === 0 || y === 0 || x === canvas.width-1 || y === canvas.height-1) edgeAlpha = Math.max(edgeAlpha, alpha);
          if (alpha > 0) { paintedPixels++; bounds[0] = Math.min(bounds[0],x); bounds[1] = Math.min(bounds[1],y); bounds[2] = Math.max(bounds[2],x); bounds[3] = Math.max(bounds[3],y); }
        }
        if (minAlpha !== 0 || maxAlpha < 100 || edgeAlpha !== 0) throw new Error(`Alpha or clipping: ${asset.module}`);
        const centerAlpha = data[(Math.floor(canvas.height/2) * canvas.width + Math.floor(canvas.width/2)) * 4 + 3];
        if (asset.module === 'pulse' && centerAlpha !== 0) throw new Error('Pulse center must stay transparent');
        canvas.width = asset.previewDrawSize[0];
        canvas.height = asset.previewDrawSize[1];
        context.fillStyle = '#0d1c29';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const small = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let highContrastPixels = 0;
        for (let i = 0; i < small.length; i += 4) if (Math.max(small[i]-13, small[i+1]-28, small[i+2]-41) > 64) highContrastPixels++;
        if (highContrastPixels === 0) throw new Error(`No visible core at suggested preview size: ${asset.module}`);
        results.push({ module: asset.module, dimensions: [image.width,image.height], minAlpha, maxAlpha, edgeAlpha, centerAlpha, paintedPixels, bounds, previewDrawSize: asset.previewDrawSize, highContrastPixels });
      }
      return results;
    }, manifest);
    const pageBounds = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, images: document.images.length }));
    if (errors.length || pageBounds.images !== 24 || pageBounds.scrollHeight > 1080 || pageBounds.scrollWidth > 1920) throw new Error(`Review layout: ${JSON.stringify({ errors, pageBounds })}`);
    const game = fs.readFileSync(path.join(workspace, 'game.js'), 'utf8');
    const weaponDeclaration = game.match(/(?:var|let|const) WEAPON_TYPES\s*=\s*\[([^\]]+)\]/);
    if (!weaponDeclaration) throw new Error('Cannot locate the game weapon catalog');
    const weaponNames = [...weaponDeclaration[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
    if (JSON.stringify(weaponNames.sort()) !== JSON.stringify(manifest.assets.map(asset => asset.module).sort())) throw new Error('Weapon artwork coverage differs from game');
    await page.screenshot({ path: path.join(output, 'review-1920x1080.png') });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checkedOn: '2026-10-09', scope: 'Artwork exports and static review, not gameplay integration', viewport: pageBounds, errors, assets: results }, null, 2) + '\n');
    console.log(`PASS: ${results.length} editable SVGs, transparent PNGs, clear margins, visible cores and 1920x1080 review.`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
