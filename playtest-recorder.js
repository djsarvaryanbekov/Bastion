(function (root) {
  "use strict";

  // Opt-in footage recorder for marketing clips. Off for every player unless this browser
  // opened the game once with ?record=1 (?record=0 turns it off again). When on, each run is
  // recorded from the game canvas (plus combat audio) and downloaded with a timed event log
  // when the run ends, so an editing agent can find the highlights without watching the video.

  var STORAGE_KEY = "bastion.playtestRecorder.enabled";
  var FRAME_RATE = 60;
  var VIDEO_BITS_PER_SECOND = 8000000;
  var CHUNK_MILLISECONDS = 1000;
  var MIN_RUN_SECONDS = 20;
  // H.264 High level 5.2 so large high-DPI canvases at 60 fps stay inside the level's limits.
  var MIME_CANDIDATES = [
    "video/mp4;codecs=avc1.640034,mp4a.40.2",
    "video/mp4;codecs=avc1.640034",
    "video/webm;codecs=h264,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  var SAMPLE_KEYS = ["matter", "kills", "modules", "coreHp", "coreHpRatio", "coreMaxHp", "enemies", "enemiesVisible",
    "friendlyProjectiles", "hostileProjectiles", "threatLevel", "bossState", "bossHpRatio", "shield", "shieldMax", "renderFps"];

  var audioEngine = null;
  var session = null;

  function readFlagFromUrl() {
    try {
      var value = new URLSearchParams(root.location.search).get("record");
      if (value === "1") root.localStorage.setItem(STORAGE_KEY, "1");
      if (value === "0") root.localStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* storage blocked: recorder stays off */ }
  }

  function isEnabled() {
    try { return root.localStorage.getItem(STORAGE_KEY) === "1"; } catch (error) { return false; }
  }

  function isSupported(canvas) {
    return Boolean(canvas && canvas.captureStream && root.MediaRecorder);
  }

  function pickMimeType() {
    for (var i = 0; i < MIME_CANDIDATES.length; i += 1) {
      if (root.MediaRecorder.isTypeSupported(MIME_CANDIDATES[i])) return MIME_CANDIDATES[i];
    }
    return "";
  }

  function secondsSince(startMs) {
    return Math.round((root.performance.now() - startMs) / 10) / 100;
  }

  function stamp(date) {
    function pad(value) { return String(value).padStart(2, "0"); }
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "_" +
      pad(date.getHours()) + "-" + pad(date.getMinutes()) + "-" + pad(date.getSeconds());
  }

  function plainCopy(value) {
    try { return JSON.parse(JSON.stringify(value || {})); } catch (error) { return {}; }
  }

  function addAudioTrack(stream) {
    if (!audioEngine) return false;
    try {
      audioEngine.ensure();
      if (!audioEngine.context || !audioEngine.masterGain) return false;
      if (!audioEngine.recorderDestination) {
        audioEngine.recorderDestination = audioEngine.context.createMediaStreamDestination();
        audioEngine.masterGain.connect(audioEngine.recorderDestination);
      }
      audioEngine.recorderDestination.stream.getAudioTracks().forEach(function (track) { stream.addTrack(track); });
      return stream.getAudioTracks().length > 0;
    } catch (error) {
      return false;
    }
  }

  function log(type, gameTime, data) {
    if (!session) return;
    var entry = { t: secondsSince(session.startMs), type: type };
    if (Number.isFinite(Number(gameTime))) entry.gameT = Math.round(Number(gameTime) * 100) / 100;
    if (data !== undefined) entry.data = data;
    session.events.push(entry);
  }

  function start(context) {
    var canvas = document.getElementById("gameCanvas");
    if (!isEnabled() || !isSupported(canvas)) return;
    var mimeType = pickMimeType();
    var stream = canvas.captureStream(FRAME_RATE);
    var hasAudio = addAudioTrack(stream);
    var recorder;
    try {
      recorder = new root.MediaRecorder(stream, mimeType ?
        { mimeType: mimeType, videoBitsPerSecond: VIDEO_BITS_PER_SECOND } :
        { videoBitsPerSecond: VIDEO_BITS_PER_SECOND });
    } catch (error) {
      console.warn("Playtest recorder could not start:", error);
      return;
    }
    session = {
      recorder: recorder,
      chunks: [],
      events: [],
      startMs: root.performance.now(),
      startedAt: new Date(),
      meta: {
        gameBuild: root.PlaytestTelemetry && root.PlaytestTelemetry.gameBuild,
        mimeType: recorder.mimeType || mimeType,
        canvas: { width: canvas.width, height: canvas.height },
        frameRate: FRAME_RATE,
        audio: hasAudio,
        context: plainCopy(context)
      }
    };
    var owned = session;
    recorder.ondataavailable = function (event) { if (event.data && event.data.size) owned.chunks.push(event.data); };
    recorder.start(CHUNK_MILLISECONDS);
  }

  function download(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function stop(outcome, result) {
    if (!session) return;
    var finished = session;
    session = null;
    var durationSeconds = secondsSince(finished.startMs);
    finished.events.push({ t: durationSeconds, type: "recording_end", data: { outcome: outcome } });
    finished.recorder.onstop = function () {
      finished.recorder.stream.getVideoTracks().forEach(function (track) { track.stop(); });
      if (durationSeconds < MIN_RUN_SECONDS || !finished.chunks.length) return;
      var mimeType = finished.meta.mimeType || "video/webm";
      var extension = /^video\/mp4/.test(mimeType) ? "mp4" : "webm";
      var baseName = "Bastion_rec_" + stamp(finished.startedAt) + "_" + String(outcome || "unknown").replace(/[^a-z0-9_-]/gi, "");
      var manifest = Object.assign({}, finished.meta, {
        format: "bastion-recording-v1",
        video: baseName + "." + extension,
        startedAt: finished.startedAt.toISOString(),
        durationSeconds: durationSeconds,
        outcome: outcome,
        result: plainCopy(result),
        timeBase: "t = seconds from the first video frame; gameT = in-game elapsed seconds",
        events: finished.events
      });
      download(new Blob(finished.chunks, { type: mimeType }), manifest.video);
      download(new Blob([JSON.stringify(manifest, null, 1)], { type: "application/json" }), baseName + ".events.json");
    };
    if (finished.recorder.state !== "inactive") finished.recorder.stop();
    else finished.recorder.onstop();
  }

  function wrap(target, name, after) {
    var original = target[name];
    if (typeof original !== "function") return;
    target[name] = function () {
      var result = original.apply(this, arguments);
      try { after.apply(null, arguments); } catch (error) { console.warn("Playtest recorder hook failed:", name, error); }
      return result;
    };
  }

  function hookTelemetry(telemetry) {
    var beginRun = telemetry.beginRun;
    telemetry.beginRun = function (context) {
      if (session) stop("restarted", null);
      var runId = beginRun.apply(this, arguments);
      try { start(context); log("run_started", 0, plainCopy(context)); } catch (error) { console.warn("Playtest recorder start failed:", error); }
      return runId;
    };
    wrap(telemetry, "finishRun", function (result) {
      log("run_finished", result && result.elapsed, plainCopy(result));
      stop((result && result.outcome) || "unknown", result);
    });
    wrap(telemetry, "event", function (type, elapsed, details) { log(type, elapsed, plainCopy(details)); });
    wrap(telemetry, "recordEnemyKill", function (type, reward, source) { log("kill", undefined, { enemy: type, source: source || "other" }); });
    wrap(telemetry, "recordBossSpawn", function (elapsed, hp, info) { log("boss_spawn", elapsed, Object.assign({ hp: hp }, plainCopy(info))); });
    wrap(telemetry, "recordBossDefeat", function (elapsed, info) { log("boss_defeat", elapsed, plainCopy(info)); });
    wrap(telemetry, "recordModuleLost", function (type, branch) { log("module_lost", undefined, { module: type, branch: branch }); });
    wrap(telemetry, "recordPurchase", function (type, price, elapsed) { log("purchase", elapsed, { module: type, price: price }); });
    wrap(telemetry, "recordDamage", function (targetType, hullDamage, shieldAbsorbed, attacker, coreHpRatio) {
      if (targetType !== "core" || !(Number(hullDamage) > 0)) return;
      log("core_hit", undefined, { damage: Math.round(Number(hullDamage)), attacker: attacker || "unknown", coreHpRatio: coreHpRatio });
    });
    wrap(telemetry, "sample", function (snapshot) {
      if (!snapshot) return;
      var data = {};
      SAMPLE_KEYS.forEach(function (key) { if (snapshot[key] !== undefined && snapshot[key] !== null) data[key] = snapshot[key]; });
      log("sample", snapshot.elapsed, data);
    });
  }

  function hookAudio(audioApi) {
    var create = audioApi.create;
    audioApi.create = function () {
      audioEngine = create.apply(this, arguments);
      return audioEngine;
    };
  }

  readFlagFromUrl();
  if (root.PlaytestTelemetry) hookTelemetry(root.PlaytestTelemetry);
  if (root.DriftCombatAudio) hookAudio(root.DriftCombatAudio);

  root.BastionPlaytestRecorder = {
    isEnabled: isEnabled,
    isRecording: function () { return Boolean(session); }
  };
})(window);
