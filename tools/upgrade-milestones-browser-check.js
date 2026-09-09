"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "outputs", "survival-upgrades-2026-09-08");
fs.mkdirSync(output, { recursive: true });
// QA covers the three visible milestones, exclusive specialization, level cap,
// scaled mobile text, the visible ship, and temporary-level reset on reload.
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (path.relative(root, file).startsWith("..") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.setHeader("Content-Type", { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[path.extname(file)] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install();
    await page.goto("http://127.0.0.1:" + server.address().port + "/?debug=1");
    await page.locator("#debugBar").evaluate(element => { element.style.visibility = "hidden"; });
    await page.locator("#startButton").click();
    await page.evaluate(() => window.__driftBastion.addMatter(5000));
    await page.keyboard.press("b");
    await page.locator('.build-cell[data-x="0"][data-y="-1"]').click();
    assert.equal(await page.locator("#buildGrid").isVisible(), true);
    await page.locator('[data-weapon="cannon"][data-choice="tune"]').click();
    assert.match(await page.locator("#upgradeList").innerText(), /Twin shot/);
    await page.locator('[data-weapon="cannon"][data-choice="twin"]').click();
    assert.equal(await page.locator('[data-weapon="cannon"][data-choice="pierce"]').count(), 0);
    const milestoneText = {};
    for (let level = 4; level <= 10; level += 1) {
      const choice = page.locator('[data-weapon="cannon"][data-choice="calibrate"]');
      if ([5, 8, 10].includes(level)) {
        milestoneText[level] = await choice.innerText();
        assert.match(milestoneText[level], level === 8 ? /25% targeting reach/ : /round per volley/);
        await page.clock.runFor(1700);
        await page.screenshot({ path: path.join(output, "cannon-level-" + level + ".png") });
      }
      await choice.click();
      assert.equal(await page.evaluate(() => window.__driftBastion.getState().upgrades.cannon.level), level - 1);
    }
    assert.equal(await page.locator('[data-weapon="cannon"]').count(), 0, "The cap must remove all purchase buttons");
    assert.match(await page.locator("#upgradeList").innerText(), /Maximum level reached/);
    await page.locator("#closeBuild").click();
    await page.locator("#pauseButton").click();
    await page.locator("#uiScaleSelect").selectOption("150");
    await page.locator("#resumeButton").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator("#debugBar").evaluate(element => { element.style.visibility = "hidden"; });
    await page.locator("#startButton").click();
    await page.evaluate(() => window.__driftBastion.addMatter(5000));
    await page.keyboard.press("b");
    await page.locator('.build-cell[data-x="0"][data-y="-1"]').click();
    assert.match(await page.locator("#upgradeList").innerText(), /Lv1\/10/, "Temporary family levels must reset after a new run");
    await page.locator('[data-weapon="cannon"][data-choice="tune"]').click();
    await page.locator('[data-weapon="cannon"][data-choice="twin"]').click();
    await page.locator('[data-weapon="cannon"][data-choice="calibrate"]').click();
    const milestone = page.locator('[data-weapon="cannon"][data-choice="calibrate"]');
    await milestone.scrollIntoViewIfNeeded();
    const bounds = await milestone.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 391 && bounds.y + bounds.height <= 845,
      "The full milestone choice must fit the mobile viewport");
    const clipped = await milestone.evaluate(element => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
    assert.equal(clipped, false, "The milestone text must not be clipped at 150% scale");
    assert.equal(await page.locator("#buildGrid").isVisible(), true, "The ship remains available while selecting its upgrade");
    await page.clock.runFor(1700);
    await page.screenshot({ path: path.join(output, "cannon-milestone-mobile-150.png") });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ passed: true, milestoneText, mobile150: true, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, milestoneText, mobile150: true, errors }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
