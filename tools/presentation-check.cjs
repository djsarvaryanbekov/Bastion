"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const exposure = "    window.__driftBastion = {";
const testExposure = "    window.__presentationTest = { Game:Game, makeTile:makeTile, save:save, audio:audio, game:function(){return game;}, activate:function(value){game=value;}, render:render };\n";
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS:"1" } },
  require(name) {
    if (name !== "fs") return require(name);
    return { ...fs, readFileSync(file, encoding) {
      const content = fs.readFileSync(file, encoding);
      return file === "game.js" ? content.replace(exposure, testExposure + exposure) : content;
    } };
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime=sandbox;", bootstrap);
const api = bootstrap.runtime.__presentationTest;
const fixture = new api.Game({ training:true });
fixture.testRange = true;
api.activate(fixture);
const target = fixture.spawnEnemy("scout", 120, 0);
const beforeHp = target.hp;
fixture.damageEnemy(target, 1, 113, 2);
assert.equal(target.hp, beforeHp - 1);
assert.ok(fixture.effects.some(effect => effect.type === "hitSpark" && effect.x === 113 && effect.y === 2));
fixture.damageEnemy(target, 10000);
const paid = fixture.matter;
assert.equal(fixture.kills, 1);
assert.ok(fixture.effects.some(effect => effect.type === "wreck" && effect.enemyType === "scout"));
fixture.killEnemy(target);
assert.equal(fixture.kills, 1);
assert.equal(fixture.matter, paid);
for (let i = 0; i < 160; i++) {
  const enemy = fixture.spawnEnemy("scout", 100, 0);
  if (enemy) fixture.damageEnemy(enemy, 10000);
}
assert.ok(fixture.effects.length <= 140, "Swarm kills must respect the effect budget");
assert.ok(fixture.particles.length <= 420, "Swarm kills must respect the particle budget");
for (let i = 0; i < 120; i++) fixture.updateEffects(1 / 60);
assert.equal(fixture.effects.length, 0, "All added feedback must expire");
assert.equal(fixture.particles.length, 0);
const reused = fixture.spawnEffect("ring", 0, 0, .1, "#fff");
assert.equal(reused.enemyType, null, "Pooled effects must not keep a previous sprite");

// These are the accepted firing tones before the rejected presentation audio pass.
const legacySounds = [
  {type:"cannon", tone:[250,.035,.018,"square",-35]},
  {type:"laser", tone:[520,.1,.024,"sawtooth",210]},
  {type:"missile", tone:[170,.08,.02,"triangle",45]},
  {type:"scatter", tone:[150,.07,.025,"square",-45]},
  {type:"arc", tone:[430,.12,.025,"sawtooth",390]},
  {type:"rail", tone:[110,.16,.04,"square",470]},
  {type:"flak", tone:[205,.07,.022,"square",-60]},
  {type:"pulse", tone:[145,.18,.035,"sine",380]},
  {type:"cryo", tone:[360,.09,.02,"triangle",-120]},
  {type:"mine", tone:[190,.06,.018,"triangle",45]},
  {type:"ember", tone:[95,.13,.02,"sawtooth",45]},
  {type:"gravity", tone:[220,.18,.022,"sine",-100]}
];
const originalTone = api.audio.tone;
try {
  for (const sound of legacySounds) {
    const firing = new api.Game({ training:true });
    const enemy = firing.spawnEnemy("scout", 1000, 0);
    enemy.hp = 1000000;
    const calls = [];
    api.audio.tone = (...args) => calls.push(args);
    firing.fireAttack(api.makeTile(sound.type,0,-1,false),{x:0,y:0},1,0,firing.weaponDefinitions[sound.type],enemy,1);
    assert.deepEqual(calls,[sound.tone],`${sound.type} no longer uses the previous sound`);
  }
} finally { api.audio.tone = originalTone; }

function writeWav(file, samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => buffer.writeInt16LE(sample, 44 + i * 2));
  fs.writeFileSync(file, buffer);
}

(async () => {
  const file = path.resolve(process.argv[2] || "outputs/Drift_Bastion_Playtest.html");
  const output = path.resolve(process.argv[3] || "outputs/qa/presentation");
  fs.mkdirSync(output, { recursive:true });
  const html = fs.readFileSync(file, "utf8");
  assert.ok(html.includes(exposure));
  const instrumented = path.join(output, "presentation-fixture.html");
  fs.writeFileSync(instrumented, html.replace(exposure, testExposure + exposure));
  const browser = await chromium.launch({ headless:true });
  const errors = [], report = { gameplayDamageAndRewards:true, pooledEffectsExpire:true, boundedSwarmFeedback:true, screens:[], audio:[] };
  try {
    const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("drift-bastion-save-v2", JSON.stringify({ version:9, settings:{ muted:true, autoPause:false }, training:{ completed:true } })));
    await page.clock.install();
    await page.goto(pathToFileURL(instrumented).href + "?debug=1");
    await page.evaluate(() => Promise.all([window.DriftEnemyArt.ready, window.DriftModuleArt.ready]));
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    for (const [width, height] of [[1920,1080]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(100);
      await page.click("#hangarMenuButton");
      assert.equal(await page.locator(".hangar-screen").evaluate(node => getComputedStyle(node).animationName), "pc-panel-enter");
      await page.clock.runFor(220);
      await page.screenshot({ path:path.join(output, `${height}-hangar.png`) });
      await page.click("#closeHangar");
      await page.click("#startButton");
      await page.clock.runFor(200);
      await page.evaluate(() => {
        const test = window.__presentationTest, game = test.game();
        game.enemies.length = 0; game.enemyById.clear(); game.effects.length = 0; game.particles.length = 0;
        for (const [type, x, y] of [["scout",180,-20], ["gunner",-100,110], ["brute",190,160], ["sniper",-210,-70]]) {
          const enemy = game.spawnEnemy(type, game.ship.x+x, game.ship.y+y);
          game.damageEnemy(enemy, 10000);
        }
        game.updateEffects(.10);
        test.render(performance.now());
      });
      await page.screenshot({ path:path.join(output, `${height}-destruction.png`) });
      await page.evaluate(() => {
        const test=window.__presentationTest, game=test.game();
        test.save.settings.reducedFlash=true;
        const enemy=game.spawnEnemy("bulwark",game.ship.x+120,game.ship.y-150);
        game.damageEnemy(enemy,1,enemy.x-10,enemy.y);
        const last=game.effects.filter(effect=>effect.type==="hitSpark").slice(-2);
        if (!last.every(effect=>effect.width===4)) throw new Error("Reduced-flash sparks remain bright");
        test.save.settings.reducedFlash=false;
      });
      await page.evaluate(() => window.__presentationTest.game().applyDamageToTile("0,0",100000));
      await page.clock.runFor(90);
      await page.screenshot({ path:path.join(output, `${height}-core-lost.png`) });
      const death = await page.evaluate(() => ({ state:window.__driftBastion.getState(), effects:window.__presentationTest.game().effects.length }));
      await page.clock.runFor(2000);
      const settled = await page.evaluate(() => ({ state:window.__driftBastion.getState(), effects:window.__presentationTest.game().effects.length }));
      assert.equal(settled.state.elapsed, death.state.elapsed, "Death effects must not advance simulation time");
      assert.equal(settled.state.matter, death.state.matter);
      assert.equal(settled.state.kills, death.state.kills);
      assert.equal(settled.effects, 0, "Wreckage must fade on Results");
      await page.click("#pcResultsMenu");
      await page.clock.runFor(220);
      assert.equal((await page.evaluate(() => window.__driftBastion.getState())).screen, "menu");
      assert.equal(await page.locator("#damageVignette").evaluate(node=>node.style.opacity), "0");
      await page.screenshot({ path:path.join(output, `${height}-menu.png`) });
      report.screens.push(`${width}x${height}@100`);
    }
    await page.emulateMedia({ reducedMotion:"reduce" });
    await page.click("#hangarMenuButton");
    assert.equal(await page.locator(".hangar-screen").evaluate(node=>getComputedStyle(node).animationName), "none");
    await page.click("#closeHangar");
    report.reducedMotionAndFlashes=true;
    report.deathEffectsDoNotAdvanceCombat=true;
    report.menuSceneClean=true;

    // Render the restored tones through Web Audio, without an audio device.
    for (const preset of legacySounds) {
      const type = preset.type;
      const sound = await page.evaluate(async tone => {
        const nativeContext=window.AudioContext, offline=new OfflineAudioContext(2,48000,48000);
        window.AudioContext=function(){ return new Proxy(offline,{ get(target,key) { if(key==="state")return "running";const value=Reflect.get(target,key,target);return typeof value==="function"?value.bind(target):value; } }); };
        const engine=window.DriftCombatAudio.create(); engine.tone(...tone);
        window.AudioContext=nativeContext;
        const voices=engine.activeVoices, result=await offline.startRendering();
        const left=result.getChannelData(0), right=result.getChannelData(1);
        let peak=0,power=0,tail=0,leftPower=0,rightPower=0;
        const samples=new Array(left.length);
        for(let i=0;i<left.length;i++){
          const value=(left[i]+right[i])*.5;
          peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));power+=value*value;
          leftPower+=left[i]*left[i];rightPower+=right[i]*right[i];
          if(i>43000)tail=Math.max(tail,Math.abs(value));
          samples[i]=Math.round(Math.max(-1,Math.min(1,value))*32767);
        }
        return { voices,remainingVoices:engine.activeVoices,peak,rms:Math.sqrt(power/left.length),tail,leftPower,rightPower,samples };
      }, preset.tone);
      assert.equal(sound.voices,1);
      assert.equal(sound.remainingVoices,0);
      assert.ok(sound.rms>.0002,`${type} preset is silent`);
      assert.ok(sound.peak<.95,`${type} preset clips`);
      assert.ok(sound.tail<.0002,`${type} preset does not settle to silence`);
      assert.ok(Math.abs(sound.rightPower-sound.leftPower)<.000001,`${type} changed the previous centered mix`);
      writeWav(path.join(output, `${type}.wav`),sound.samples,48000);
      delete sound.samples;report.audio.push({ type,...sound });
    }
    const lifecycle=await page.evaluate(async()=>{
      const engine=window.__presentationTest.audio;
      engine.setFocused(true);engine.muted=false;engine.ensure();await engine.context.resume();
      for(let i=0;i<80;i++)engine.tone(220,.2,.02,"sine",80);
      const peak=engine.activeVoices;
      const ended=Promise.all(Array.from(engine.sources,source=>new Promise(resolve=>source.addEventListener("ended",resolve,{once:true}))));
      engine.muted=true;await ended;
      const stopped=engine.sources.size;
      engine.muted=false;engine.setVolume(0);engine.tone(220,.2,.02,"sine",80);
      const zeroVolumeVoices=engine.sources.size;
      engine.setVolume(.8);engine.tone(220,.2,.02,"sine",80);
      const focusEnded=Promise.all(Array.from(engine.sources,source=>new Promise(resolve=>source.addEventListener("ended",resolve,{once:true}))));
      engine.setFocused(false);await focusEnded;engine.tone(220,.2,.02,"sine",80);
      const unfocusedVoices=engine.sources.size;
      engine.setFocused(true);
      return {peak,stopped,zeroVolumeVoices,unfocusedVoices,max:engine.maxVoices};
    });
    assert.ok(lifecycle.peak<=lifecycle.max);
    assert.equal(lifecycle.stopped,0);
    assert.equal(lifecycle.zeroVolumeVoices,0);
    assert.equal(lifecycle.unfocusedVoices,0);
    report.voiceCapMuteAndZeroVolume=true;
    report.focusLossStopsAudio=true;
    report.previousWeaponSoundsRestored=true;
    assert.deepEqual(errors,[]);
    report.passed=true;report.errors=errors;
    fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2));
    console.log(JSON.stringify({passed:true,checks:Object.keys(report).filter(key=>report[key]===true),screens:report.screens,weaponSounds:report.audio.length,errors},null,2));
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error);process.exitCode=1; });
