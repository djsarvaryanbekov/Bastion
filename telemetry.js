(function () {
  "use strict";

  var STORAGE_KEY = "drift-bastion-playtest-v1";
  var SCHEMA_VERSION = 2;
  var GAME_BUILD = "2026.09.09-bastion-16";
  var SAMPLE_INTERVAL = 5;
  var MAX_RUNS = 30;
  var MAX_STORAGE_BYTES = 1500000;
  var DPS_WINDOW_SECONDS = 5;
  var DPS_BUCKET_SECONDS = .1;
  var DPS_BUCKET_COUNT = 51;
  var damageBucketTimes = new Array(DPS_BUCKET_COUNT).fill(-1);
  var damageBucketValues = new Array(DPS_BUCKET_COUNT).fill(0);
  var METRIC_DEFINITIONS = {
    swarmRate: "Historical build 14 only: nominal individual arrivals per simulation second before the active cap. Current grouped spawning reports assaultIndex and ambientPacks instead.",
    enemiesVisible: "Living bodies intersecting the camera viewport, including bosses; differs from total active enemies.",
    gameBuild: "Top-level gameBuild identifies the exporter. Only a run's own gameBuild identifies its recorded build; absent on historical runs.",
    elapsed: "Simulation seconds; Build, Pause and the continuation decision do not advance this clock.",
    damageDealt: "Actual enemy HP plus shield removed, capped before overkill. Hull and shield totals are also recorded separately.",
    outgoingDps5s: "Actual damage over the trailing 5 simulation seconds in 100 ms buckets, divided by min(5, elapsed). Excludes future buckets.",
    averageOutgoingDps: "Total actual outgoing damage divided by all elapsed simulation seconds, including time without targets.",
    bossDuration: "spawnToDefeatSeconds runs from spawn; engagementSeconds runs from the first recorded damaging hit. Missing hits remain null.",
    matterBalanceError: "Initial Matter + earned + refunds - spent - final Matter. Nonzero means a missing transaction hook or explicit debug funding.",
    fragmentReward: "Integer Fragments are banked at run end. (earnedUnits + carryBeforeUnits) = fragmentsEarned * scale + carryAfterUnits. Carry is progress toward the same currency, saved between runs; absent on old logs. Start context records the wallet, carry and purchased licences/cores separately from Matter.",
    absentMetrics: "Fields missing from historical records are unavailable; they must not be interpreted as zero."
  };

  var data = loadData();
  var activeRun = null;
  var nextSampleAt = 0;
  var dirty = false;
  var lastPersistedAt = 0;
  var storageAvailable = true;

  closeInterruptedRuns();

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + "-" + crypto.randomUUID();
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function blankData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      gameBuild: GAME_BUILD,
      metricDefinitions: clonePlain(METRIC_DEFINITIONS),
      testerId: makeId("tester"),
      createdAt: nowIso(),
      runs: []
    };
  }

  function loadData() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || (parsed.schemaVersion !== 1 && parsed.schemaVersion !== SCHEMA_VERSION) || !Array.isArray(parsed.runs)) return blankData();
      parsed.schemaVersion = SCHEMA_VERSION;
      parsed.gameBuild = GAME_BUILD;
      parsed.metricDefinitions = clonePlain(METRIC_DEFINITIONS);
      return parsed;
    } catch (error) {
      return blankData();
    }
  }

  function closeInterruptedRuns() {
    var changed = false;
    for (var i = 0; i < data.runs.length; i += 1) {
      var run = data.runs[i];
      if (!run.endedAt) {
        run.endedAt = nowIso();
        run.outcome = "interrupted";
        run.summary = run.summary || summaryFromRun(run, { outcome: "interrupted" });
        delete run._buildOpenedAt;
        delete run._buildOpenedWall;
        delete run._pauseOpenedAt;
        delete run._pauseOpenedWall;
        changed = true;
      }
    }
    if (changed) persist(true);
  }

  function clonePlain(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return null; }
  }

  function round(value, digits) {
    var factor = Math.pow(10, digits || 0);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function amount(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function optionalAmount(value) {
    return typeof value === "number" && Number.isFinite(value) ? round(Math.max(0, value), 3) : null;
  }

  function environmentSnapshot() {
    var nav = typeof navigator === "undefined" ? {} : navigator;
    var standalone = Boolean(nav.standalone || (window.matchMedia && (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    )));
    return {
      userAgent: nav.userAgent || "unknown",
      language: nav.language || "unknown",
      viewport: { width: window.innerWidth || 0, height: window.innerHeight || 0 },
      devicePixelRatio: window.devicePixelRatio || 1,
      touchPoints: nav.maxTouchPoints || 0,
      hardwareConcurrency: nav.hardwareConcurrency || null,
      deviceMemoryGb: nav.deviceMemory || null,
      displayMode: standalone ? "standalone" : "browser"
    };
  }

  function makeStats() {
    return {
      matterEarned: 0,
      matterSpent: 0,
      matterRefunded: 0,
      initialMatter: null,
      matterSpentByReason: {},
      modulesSoldByType: {},
      moduleMoves: 0,
      upgradesPurchased: 0,
      hullDamageDealt: 0,
      shieldDamageDealt: 0,
      damageDealtByTargetType: {},
      bossEncounters: [],
      buildVisits: 0,
      buildSeconds: 0,
      pauseVisits: 0,
      pauseSeconds: 0,
      damageToCore: 0,
      damageToModules: 0,
      shieldDamageAbsorbed: 0,
      enemiesKilledByType: {},
      modulesPurchasedByType: {},
      modulesLostByType: {},
      disconnectedModules: 0,
      peakEnemies: 0,
      peakProjectiles: 0,
      minimumCoreHpRatio: 1,
      bossSpawnTime: null,
      bossDefeatTime: null
    };
  }

  function summaryFromRun(run, extra) {
    var finalSample = run.samples.length ? run.samples[run.samples.length - 1] : {};
    var result = {
      outcome: (extra && extra.outcome) || run.outcome || "unknown",
      durationSeconds: round((extra && extra.elapsed) !== undefined ? extra.elapsed : finalSample.t, 1),
      kills: (extra && extra.kills) !== undefined ? extra.kills : (finalSample.kills || 0),
      finalMatter: round((extra && extra.matter) !== undefined ? extra.matter : finalSample.matter, 1),
      finalModules: (extra && extra.modules) !== undefined ? extra.modules : (finalSample.modules || 0),
      fragmentsEarned: (extra && extra.fragments) || 0,
      matterEarned: round(run.stats.matterEarned, 1),
      matterSpent: round(run.stats.matterSpent, 1),
      matterPerMinute: round(run.stats.matterEarned / Math.max(1, ((extra && extra.elapsed) !== undefined ? extra.elapsed : finalSample.t) || 0) * 60, 1),
      buildVisits: run.stats.buildVisits,
      buildSeconds: round(run.stats.buildSeconds, 1),
      pauseVisits: run.stats.pauseVisits,
      pauseSeconds: round(run.stats.pauseSeconds, 1),
      enemiesKilledByType: clonePlain(run.stats.enemiesKilledByType),
      modulesPurchased: clonePlain(run.stats.modulesPurchasedByType),
      modulesLost: clonePlain(run.stats.modulesLostByType),
      disconnectedModules: run.stats.disconnectedModules,
      damageToCore: round(run.stats.damageToCore, 1),
      damageToModules: round(run.stats.damageToModules, 1),
      shieldDamageAbsorbed: round(run.stats.shieldDamageAbsorbed, 1),
      peakEnemies: run.stats.peakEnemies,
      peakProjectiles: run.stats.peakProjectiles,
      minimumCoreHpRatio: round(run.stats.minimumCoreHpRatio, 3),
      bossSpawnTime: run.stats.bossSpawnTime,
      bossDefeatTime: run.stats.bossDefeatTime
    };
    if (run.metricsVersion >= 2) {
      result.gameBuild = run.gameBuild;
      result.initialMatter = run.stats.initialMatter;
      result.matterRefunded = round(run.stats.matterRefunded, 1);
      result.matterSpentByReason = clonePlain(run.stats.matterSpentByReason);
      result.matterBalanceError = Number.isFinite(run.stats.initialMatter) ? round(run.stats.initialMatter + run.stats.matterEarned + run.stats.matterRefunded - run.stats.matterSpent - result.finalMatter, 3) : null;
      result.hullDamageDealt = round(run.stats.hullDamageDealt, 2);
      result.shieldDamageDealt = round(run.stats.shieldDamageDealt, 2);
      result.damageDealt = round(run.stats.hullDamageDealt + run.stats.shieldDamageDealt, 2);
      result.averageOutgoingDps = result.durationSeconds > 0 ? round(result.damageDealt / result.durationSeconds, 2) : 0;
      result.damageDealtByTargetType = clonePlain(run.stats.damageDealtByTargetType);
      result.bossEncounters = clonePlain(run.stats.bossEncounters);
      result.modulesSold = clonePlain(run.stats.modulesSoldByType);
      result.moduleMoves = run.stats.moduleMoves;
      result.upgradesPurchased = run.stats.upgradesPurchased;
      ["coreHp", "coreMaxHp", "moduleHp", "moduleMaxHp", "shield", "shieldMax", "shieldModules", "activeShieldModules", "bossHp", "bossMaxHp", "bossShield", "bossMaxShield"].forEach(function (key) {
        result["final" + key.charAt(0).toUpperCase() + key.slice(1)] = finalSample[key] === undefined ? null : finalSample[key];
      });
    }
    if (extra && extra.fragmentReward) result.fragmentReward = clonePlain(extra.fragmentReward);
    return result;
  }

  function trimRuns() {
    while (data.runs.length > MAX_RUNS) data.runs.shift();
    var serialized = JSON.stringify(data);
    while (serialized.length > MAX_STORAGE_BYTES && data.runs.length > 1) {
      data.runs.shift();
      serialized = JSON.stringify(data);
    }
    return serialized;
  }

  function persist(force) {
    var wallNow = Date.now();
    if (!dirty && !force) return true;
    if (!force && wallNow - lastPersistedAt < 15000) return false;
    try {
      localStorage.setItem(STORAGE_KEY, trimRuns());
      lastPersistedAt = wallNow;
      dirty = false;
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function event(type, elapsed, details) {
    if (!activeRun) return;
    activeRun.events.push({
      t: round(elapsed, 2),
      type: type,
      data: clonePlain(details || {})
    });
    dirty = true;
    persist(false);
  }

  function addCounter(map, key, amount) {
    map[key] = (map[key] || 0) + (amount === undefined ? 1 : amount);
  }

  function beginRun(context, firstSample) {
    if (activeRun) abandonRun("restarted", context && context.elapsed);
    activeRun = {
      runId: makeId("run"),
      gameBuild: GAME_BUILD,
      metricsVersion: 2,
      startedAt: nowIso(),
      endedAt: null,
      outcome: null,
      context: clonePlain(context || {}),
      environment: environmentSnapshot(),
      events: [],
      samples: [],
      stats: makeStats(),
      summary: null,
      _buildOpenedAt: null,
      _buildOpenedWall: null,
      _pauseOpenedAt: null,
      _pauseOpenedWall: null
    };
    data.runs.push(activeRun);
    damageBucketTimes.fill(-1);
    damageBucketValues.fill(0);
    activeRun.stats.initialMatter = firstSample ? optionalAmount(firstSample.matter) : null;
    nextSampleAt = 0;
    event("run_started", 0, { starterWeapon: activeRun.context.starterWeapon || "unknown" });
    if (firstSample) sample(firstSample, true);
    dirty = true;
    persist(true);
    return activeRun.runId;
  }

  function shouldSample(elapsed) {
    return Boolean(activeRun && Number(elapsed) + .001 >= nextSampleAt);
  }

  function sample(snapshot, force) {
    if (!activeRun || !snapshot) return false;
    var elapsed = Number(snapshot.elapsed) || 0;
    if (!force && elapsed + .001 < nextSampleAt) return false;
    var clean = {
      t: round(elapsed, 1),
      matter: round(snapshot.matter, 1),
      kills: Math.max(0, Math.floor(snapshot.kills || 0)),
      modules: Math.max(0, Math.floor(snapshot.modules || 0)),
      coreHp: round(snapshot.coreHp, 1),
      coreHpRatio: round(snapshot.coreHpRatio, 3),
      enemies: Math.max(0, Math.floor(snapshot.enemies || 0)),
      friendlyProjectiles: Math.max(0, Math.floor(snapshot.friendlyProjectiles || 0)),
      hostileProjectiles: Math.max(0, Math.floor(snapshot.hostileProjectiles || 0)),
      totalEnemiesSpawned: Math.max(0, Math.floor(snapshot.totalEnemiesSpawned || 0)),
      threatLevel: Math.max(0, Math.floor(snapshot.threatLevel || 0)),
      bossState: snapshot.bossState || "not_spawned",
      bossHpRatio: round(snapshot.bossHpRatio, 3),
      simulationFps: round(snapshot.simulationFps, 1),
      renderFps: round(snapshot.renderFps, 1),
      minimumSimulationFps: round(snapshot.minimumSimulationFps, 1),
      minimumRenderFps: round(snapshot.minimumRenderFps, 1),
      qualityTier: Math.max(0, Math.floor(snapshot.qualityTier || 0))
    };
    ["coreMaxHp", "moduleHp", "moduleMaxHp", "shield", "shieldMax", "shieldModules", "activeShieldModules", "bossHp", "bossMaxHp", "bossShield", "bossMaxShield"].forEach(function (key) {
      clean[key] = optionalAmount(snapshot[key]);
    });
    ["assaultIndex", "ambientPacks", "streamEnemiesSpawned", "swarmRepositioned", "swarmRate", "enemiesVisible"].forEach(function (key) {
      if (Number.isFinite(snapshot[key])) clean[key] = round(Math.max(0, snapshot[key]), 3);
    });
    clean.matterEarned = round(activeRun.stats.matterEarned, 2);
    clean.matterSpent = round(activeRun.stats.matterSpent, 2);
    clean.matterRefunded = round(activeRun.stats.matterRefunded, 2);
    clean.hullDamageDealt = round(activeRun.stats.hullDamageDealt, 2);
    clean.shieldDamageDealt = round(activeRun.stats.shieldDamageDealt, 2);
    clean.damageDealt = round(activeRun.stats.hullDamageDealt + activeRun.stats.shieldDamageDealt, 2);
    clean.dpsWindowSeconds = round(Math.min(DPS_WINDOW_SECONDS, Math.max(0, elapsed)), 3);
    clean.outgoingDps5s = outgoingDps(elapsed);
    activeRun.samples.push(clean);
    activeRun.stats.peakEnemies = Math.max(activeRun.stats.peakEnemies, clean.enemies);
    activeRun.stats.peakProjectiles = Math.max(activeRun.stats.peakProjectiles, clean.friendlyProjectiles + clean.hostileProjectiles);
    activeRun.stats.minimumCoreHpRatio = Math.min(activeRun.stats.minimumCoreHpRatio, clean.coreHpRatio);
    nextSampleAt += SAMPLE_INTERVAL;
    while (nextSampleAt <= elapsed + .001) nextSampleAt += SAMPLE_INTERVAL;
    dirty = true;
    persist(false);
    return true;
  }

  function recordEnemyKill(type, reward) {
    if (!activeRun) return;
    addCounter(activeRun.stats.enemiesKilledByType, type || "unknown");
    activeRun.stats.matterEarned += amount(reward);
    dirty = true;
  }

  function recordDamage(targetType, hullDamage, shieldAbsorbed) {
    if (!activeRun) return;
    var damage = amount(hullDamage);
    if (targetType === "core") activeRun.stats.damageToCore += damage;
    else activeRun.stats.damageToModules += damage;
    activeRun.stats.shieldDamageAbsorbed += amount(shieldAbsorbed);
    dirty = true;
  }

  function recordPurchase(type, price, elapsed, placement) {
    if (!activeRun) return;
    addCounter(activeRun.stats.modulesPurchasedByType, type || "unknown");
    spendMatter("module", price);
    event("module_purchased", elapsed, { type: type, price: price, placement: clonePlain(placement) });
  }

  function recordModuleLost(type, branch) {
    if (!activeRun) return;
    addCounter(activeRun.stats.modulesLostByType, type || "unknown");
    if (branch) activeRun.stats.disconnectedModules += 1;
    dirty = true;
  }

  function spendMatter(reason, price) {
    var spent = amount(price);
    activeRun.stats.matterSpent += spent;
    addCounter(activeRun.stats.matterSpentByReason, reason || "other", spent);
  }

  function recordMatterSpent(reason, price, elapsed, details) {
    if (!activeRun) return;
    spendMatter(reason, price);
    event("matter_spent", elapsed, { reason: reason, price: amount(price), details: clonePlain(details || {}) });
  }

  function recordUpgrade(type, choice, price, elapsed, details) {
    if (!activeRun) return;
    spendMatter("upgrade", price);
    activeRun.stats.upgradesPurchased += 1;
    event("weapon_upgraded", elapsed, { type: type, choice: choice, price: amount(price), level: details && details.level, branch: details && details.branch });
  }

  function recordMove(type, from, to, elapsed) {
    if (!activeRun) return;
    activeRun.stats.moduleMoves += 1;
    event("module_moved", elapsed, { type: type, from: clonePlain(from), to: clonePlain(to) });
  }

  function recordSale(type, refund, elapsed, placement) {
    if (!activeRun) return;
    activeRun.stats.matterRefunded += amount(refund);
    addCounter(activeRun.stats.modulesSoldByType, type || "unknown");
    event("module_sold", elapsed, { type: type, refund: amount(refund), placement: clonePlain(placement) });
  }

  function currentBoss(id) {
    if (!activeRun) return null;
    var encounters = activeRun.stats.bossEncounters;
    for (var index = encounters.length - 1; index >= 0; index -= 1) {
      var boss = encounters[index];
      if (boss.defeatedAt === null && (id === undefined || id === null || boss.id === null || boss.id === id)) return boss;
    }
    return null;
  }

  function recordOutgoingDamage(targetType, hullDamage, shieldAbsorbed, elapsed, targetId) {
    if (!activeRun || !Number.isFinite(elapsed) || elapsed < 0) return;
    var hull = amount(hullDamage);
    var shield = amount(shieldAbsorbed);
    var total = hull + shield;
    if (!total) return;
    activeRun.stats.hullDamageDealt += hull;
    activeRun.stats.shieldDamageDealt += shield;
    addCounter(activeRun.stats.damageDealtByTargetType, targetType || "unknown", total);
    var bucket = Math.floor((elapsed + .0000001) / DPS_BUCKET_SECONDS);
    var slot = bucket % DPS_BUCKET_COUNT;
    if (damageBucketTimes[slot] !== bucket) {
      damageBucketTimes[slot] = bucket;
      damageBucketValues[slot] = 0;
    }
    damageBucketValues[slot] += total;
    if (targetType === "boss") {
      var boss = currentBoss(targetId);
      if (boss) {
        if (boss.firstDamageAt === null) boss.firstDamageAt = round(elapsed, 3);
        boss.hullDamageTaken = round(boss.hullDamageTaken + hull, 3);
        boss.shieldDamageTaken = round(boss.shieldDamageTaken + shield, 3);
      }
    }
    dirty = true;
  }

  function outgoingDps(elapsed) {
    if (!(elapsed > 0)) return 0;
    var currentBucket = Math.floor((elapsed + .0000001) / DPS_BUCKET_SECONDS);
    var firstBucket = currentBucket - Math.round(DPS_WINDOW_SECONDS / DPS_BUCKET_SECONDS) + 1;
    var total = 0;
    for (var index = 0; index < DPS_BUCKET_COUNT; index += 1) {
      if (damageBucketTimes[index] >= firstBucket && damageBucketTimes[index] <= currentBucket) total += damageBucketValues[index];
    }
    return round(total / Math.min(DPS_WINDOW_SECONDS, elapsed), 2);
  }

  function recordBossSpawn(elapsed, hp, details) {
    if (!activeRun) return;
    activeRun.stats.bossSpawnTime = round(elapsed, 1);
    details = details || {};
    var boss = { index: activeRun.stats.bossEncounters.length + 1, id: details.id === undefined ? null : details.id,
      variant: details.variant || null, spawnedAt: round(elapsed, 3), startingHp: optionalAmount(hp),
      firstDamageAt: null, defeatedAt: null, spawnToDefeatSeconds: null, engagementSeconds: null,
      hullDamageTaken: 0, shieldDamageTaken: 0 };
    activeRun.stats.bossEncounters.push(boss);
    event("boss_spawned", elapsed, { hp: hp, id: boss.id, variant: boss.variant, encounter: boss.index });
  }

  function recordBossDefeat(elapsed, details) {
    if (!activeRun) return;
    activeRun.stats.bossDefeatTime = round(elapsed, 1);
    var boss = currentBoss(details && details.id);
    if (boss) {
      boss.defeatedAt = round(elapsed, 3);
      boss.spawnToDefeatSeconds = round(Math.max(0, elapsed - boss.spawnedAt), 3);
      boss.engagementSeconds = boss.firstDamageAt === null ? null : round(Math.max(0, elapsed - boss.firstDamageAt), 3);
    }
    event("boss_defeated", elapsed, boss ? clonePlain(boss) : { id: details && details.id, engagementSeconds: null });
  }

  function recordBuild(opened, elapsed, details) {
    if (!activeRun) return;
    if (opened) {
      if (activeRun._buildOpenedWall !== null) return;
      activeRun.stats.buildVisits += 1;
      activeRun._buildOpenedAt = Number(elapsed) || 0;
      activeRun._buildOpenedWall = Date.now();
      event("build_opened", elapsed, details);
      return;
    }
    if (activeRun._buildOpenedWall === null) return;
    activeRun.stats.buildSeconds += Math.max(0, (Date.now() - activeRun._buildOpenedWall) / 1000);
    activeRun._buildOpenedAt = null;
    activeRun._buildOpenedWall = null;
    event("build_closed", elapsed, details);
  }

  function recordPause(opened, elapsed, reason) {
    if (!activeRun) return;
    if (opened) {
      if (activeRun._pauseOpenedWall !== null) return;
      activeRun.stats.pauseVisits += 1;
      activeRun._pauseOpenedAt = Number(elapsed) || 0;
      activeRun._pauseOpenedWall = Date.now();
      event("pause_opened", elapsed, { reason: reason || "manual" });
      return;
    }
    if (activeRun._pauseOpenedWall === null) return;
    activeRun.stats.pauseSeconds += Math.max(0, (Date.now() - activeRun._pauseOpenedWall) / 1000);
    activeRun._pauseOpenedAt = null;
    activeRun._pauseOpenedWall = null;
    event("pause_closed", elapsed, {});
  }

  function finishRun(result, finalSample) {
    if (!activeRun) return;
    if (finalSample) sample(finalSample, true);
    var elapsed = Number(result && result.elapsed) || 0;
    recordBuild(false, elapsed, { reason: "run_finished" });
    recordPause(false, elapsed);
    event("run_finished", elapsed, result || {});
    activeRun.endedAt = nowIso();
    activeRun.outcome = (result && result.outcome) || "unknown";
    activeRun.summary = summaryFromRun(activeRun, result || {});
    delete activeRun._buildOpenedAt;
    delete activeRun._buildOpenedWall;
    delete activeRun._pauseOpenedAt;
    delete activeRun._pauseOpenedWall;
    activeRun = null;
    dirty = true;
    persist(true);
  }

  function abandonRun(reason, elapsed) {
    if (!activeRun) return;
    finishRun({ outcome: reason || "abandoned", elapsed: Number(elapsed) || 0, fragments: 0 }, null);
  }

  function status() {
    var serialized = JSON.stringify(data);
    var completed = 0;
    for (var i = 0; i < data.runs.length; i += 1) if (data.runs[i].endedAt) completed += 1;
    return {
      testerId: data.testerId,
      runs: data.runs.length,
      completedRuns: completed,
      active: Boolean(activeRun),
      bytes: serialized.length,
      storageAvailable: storageAvailable
    };
  }

  function exportLog() {
    persist(true);
    var exportData = clonePlain(data);
    for (var i = 0; i < exportData.runs.length; i += 1) {
      delete exportData.runs[i]._buildOpenedAt;
      delete exportData.runs[i]._buildOpenedWall;
      delete exportData.runs[i]._pauseOpenedAt;
      delete exportData.runs[i]._pauseOpenedWall;
    }
    exportData.exportedAt = nowIso();
    var json = JSON.stringify(exportData, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    var date = nowIso().slice(0, 10);
    link.href = url;
    link.download = "Drift_Bastion_Playtest_" + data.testerId.slice(-8) + "_" + date + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return link.download;
  }

  function clearCompleted() {
    var kept = activeRun ? [activeRun] : [];
    data.runs = kept;
    dirty = true;
    persist(true);
  }

  window.PlaytestTelemetry = {
    beginRun: beginRun,
    shouldSample: shouldSample,
    sample: sample,
    event: event,
    recordEnemyKill: recordEnemyKill,
    recordDamage: recordDamage,
    recordOutgoingDamage: recordOutgoingDamage,
    recordPurchase: recordPurchase,
    recordMatterSpent: recordMatterSpent,
    recordUpgrade: recordUpgrade,
    recordMove: recordMove,
    recordSale: recordSale,
    recordModuleLost: recordModuleLost,
    recordBossSpawn: recordBossSpawn,
    recordBossDefeat: recordBossDefeat,
    recordBuild: recordBuild,
    recordPause: recordPause,
    finishRun: finishRun,
    abandonRun: abandonRun,
    flush: function () { persist(true); },
    exportLog: exportLog,
    clearCompleted: clearCompleted,
    getStatus: status,
    getDataForTests: function () { return clonePlain(data); }
  };
})();
