"use strict";
require("./english-browser-locale.cjs");
// Plays a short real-time run in a freshly built copy and checks the opt-in footage recorder:
// off by default, and with ?record=1 it downloads a playable video plus a timed event log when the run ends.
// Set RECORDER_KEEP_DIR to keep the downloaded files. The main HTML and the user's profile are never touched.
// Runs in a visible Chrome window: headless Chrome intermittently stops delivering canvas frames to MediaRecorder,
// which produced audio-only files that real (headed) play never does.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "bastion-recorder-"));
const built = path.join(workDir, "Drift_Bastion_Playtest.html");
const keepDir = process.env.RECORDER_KEEP_DIR ? path.resolve(process.env.RECORDER_KEEP_DIR) : null;
const PLAY_SECONDS = 25;
execFileSync(process.execPath, [path.join(__dirname, "build-standalone.js"), built], { cwd: root, stdio: "ignore" });
const marker = "window.__driftBastion = {";
const html = fs.readFileSync(built, "utf8");
assert.equal(html.split(marker).length, 2);
const fixture = path.join(workDir, "Drift_Bastion_Playtest_fixture.html");
fs.writeFileSync(fixture, html.replace(marker, "window.__recorderCheck = { game: function () { return game; } };\n    " + marker));

const SAVE = JSON.stringify({ version: 9, fragments: 0,
  progression: { schemaVersion: 4, purchasedModules: ["laser", "ember", "missile"], branchLicenses: [] },
  settings: { muted: false }, training: { completed: true } });

async function launch() {
  const args = ["--autoplay-policy=no-user-gesture-required"];
  try { return await chromium.launch({ channel: "chrome", headless: false, args }); }
  catch (error) { return chromium.launch({ headless: false, args }); }
}

async function openGame(browser, query) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(save => localStorage.setItem("drift-bastion-save-v2", save), SAVE);
  await page.goto(pathToFileURL(fixture).href + query);
  return { context, page, errors };
}

async function startArmedRun(page) {
  await page.click("#startButton");
  await page.evaluate(() => {
    const api = window.__driftBastion;
    api.setInvulnerable(true);
    api.placeModule("laser", 1, 0); api.placeModule("ember", -1, 0); api.placeModule("missile", 0, 1);
  });
}

function ffprobe(file) {
  try {
    const output = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
      "-of", "json", file], { encoding: "utf8" });
    return JSON.parse(output);
  } catch (error) {
    return null;
  }
}

(async () => {
  const browser = await launch();
  try {
    // 1. Without the flag nothing records.
    const plain = await openGame(browser, "?debug=1");
    await startArmedRun(plain.page);
    const plainState = await plain.page.evaluate(() => ({ enabled: window.BastionPlaytestRecorder.isEnabled(), recording: window.BastionPlaytestRecorder.isRecording() }));
    assert.deepEqual(plainState, { enabled: false, recording: false }, "Recorder stays off for normal players");
    assert.deepEqual(plain.errors, []);
    await plain.context.close();

    // 2. With ?record=1 a real-time run is recorded and downloaded when it ends.
    const recorded = await openGame(browser, "?debug=1&record=1");
    const page = recorded.page;
    const downloads = [];
    page.on("download", download => downloads.push(download));
    await startArmedRun(page);
    assert.equal(await page.evaluate(() => window.BastionPlaytestRecorder.isRecording()), true, "Recording starts with the run");
    await page.waitForTimeout(PLAY_SECONDS * 500);
    await page.evaluate(() => window.__driftBastion.spawnBoss());
    await page.waitForTimeout(PLAY_SECONDS * 500);
    await page.evaluate(() => {
      const api = window.__driftBastion, game = window.__recorderCheck.game();
      api.setInvulnerable(false);
      Array.from(game.ship.tiles.values()).filter(tile => tile.type !== "core").forEach(tile => api.destroyModule(tile.x, tile.y));
      game.ship.tiles.get("0,0").hp = 1;
    });
    await page.waitForFunction(() => !window.PlaytestTelemetry.getStatus().active, null, { timeout: 60000 });
    for (let wait = 0; wait < 100 && downloads.length < 2; wait += 1) await page.waitForTimeout(200);
    assert.equal(downloads.length, 2, "Video and event log are downloaded");

    const saveDir = keepDir || workDir;
    fs.mkdirSync(saveDir, { recursive: true });
    const files = [];
    for (const download of downloads) {
      const target = path.join(saveDir, download.suggestedFilename());
      await download.saveAs(target);
      files.push(target);
    }
    const videoFile = files.find(file => /\.(mp4|webm)$/.test(file));
    const logFile = files.find(file => file.endsWith(".events.json"));
    assert.ok(videoFile && logFile, "One video and one event log: " + files.map(file => path.basename(file)).join(", "));
    assert.ok(fs.statSync(videoFile).size > 200000, "Video has real content");

    const log = JSON.parse(fs.readFileSync(logFile, "utf8"));
    const types = new Set(log.events.map(entry => entry.type));
    assert.equal(log.format, "bastion-recording-v1");
    assert.equal(path.basename(videoFile), log.video, "Log names its video");
    assert.equal(path.extname(videoFile), /^video\/mp4/.test(log.mimeType) ? ".mp4" : ".webm", "File extension matches the codec");
    // Telemetry samples every 30 s, so a 25 s check run has none; real runs do.
    for (const type of ["run_started", "wave_start", "kill", "boss_spawn", "run_finished", "recording_end"]) assert.ok(types.has(type), "Log has " + type);
    assert.ok(log.events.every((entry, index) => index === 0 || entry.t >= log.events[index - 1].t), "Event times only move forward");
    assert.ok(log.durationSeconds >= PLAY_SECONDS, "Duration covers the run: " + log.durationSeconds);

    const probe = ffprobe(videoFile);
    assert.ok(probe, "ffprobe can read the video");
    {
      const video = probe.streams.find(stream => stream.codec_type === "video");
      assert.ok(video && video.width > 0 && video.height > 0, "Video stream decodes");
      const seconds = Number(probe.format.duration);
      if (Number.isFinite(seconds)) assert.ok(Math.abs(seconds - log.durationSeconds) < 4, "Video length matches the log: " + seconds + " vs " + log.durationSeconds);
    }
    assert.deepEqual(recorded.errors, []);
    console.log(JSON.stringify({ passed: true, video: path.basename(videoFile), mimeType: log.mimeType, audio: log.audio,
      bytes: fs.statSync(videoFile).size, seconds: log.durationSeconds, events: log.events.length,
      kills: log.events.filter(entry => entry.type === "kill").length, probe: probe && probe.streams, kept: keepDir }));
    await recorded.context.close();
  } finally {
    await browser.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
