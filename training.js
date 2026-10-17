(function (root, factory) {
  "use strict";
  var training = factory();
  if (typeof module === "object" && module.exports) module.exports = training;
  if (root) root.DriftTraining = training;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var MAIN_IDS = ["combat", "construction", "upgrades"];
  var DEFINITIONS = {
    combat: {
      title: "Fight",
      setup: { targets: [{ id: "combat-1", x: -130, y: -210, hp: 72 }, { id: "combat-2", x: 0, y: -260, hp: 72 }, { id: "combat-3", x: 150, y: -210, hp: 72 }], targetGroup: "combat", relativeToShip: true }
    },
    construction: {
      title: "Add a Cannon",
      setup: { targets: [{ id: "construction-1", x: -130, y: -230, hp: 72 }, { id: "construction-2", x: 130, y: -230, hp: 72 }], targetGroup: "construction", relativeToShip: true }
    },
    upgrades: {
      title: "Upgrade both Cannons",
      setup: { targets: [{ id: "upgrades-1", x: -130, y: -230, hp: 72 }, { id: "upgrades-2", x: 130, y: -230, hp: 72 }], targetGroup: "upgrades", relativeToShip: true }
    }
  };

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function stage(id) { return MAIN_IDS.indexOf(id) >= 0 ? copy(DEFINITIONS[id]) : null; }
  function finite(value) { return typeof value === "number" && Number.isFinite(value); }
  function count(value) { return finite(value) ? Math.max(0, Math.floor(value)) : null; }

  function presentation(state, context) {
    state = state || {};
    context = context || {};
    var progress = state.progress || {};
    var copies = count(progress.copies) || 0;
    var needsCannon = state.stageId !== "combat" && (copies < 2 || (state.stageId === "construction" && !progress.placed));
    var needsUpgrade = state.stageId === "upgrades" && !progress.upgraded;
    var result = {
      action: state.action || "", progressText: state.progressText || "", highlightTarget: null,
      buildLabel: needsUpgrade && !needsCannon ? "Upgrade [B]" : "Build [B]",
      buildHighlighted: false
    };
    if (!state.active || state.completed || state.status === "complete" || state.status === "failed" || context.paused) return result;

    function guide(action, target) {
      result.action = action;
      result.highlightTarget = target;
      result.buildHighlighted = target === "build";
      return result;
    }
    function missing(cost) {
      return finite(cost) && finite(context.matter) ? Math.max(0, Math.ceil(cost - context.matter)) : 0;
    }
    function improved() {
      var damage = context.cannonDamageBonusPercent;
      if (finite(damage) && damage > 0) return "All " + copies + " Cannons deal " + Math.round(damage) + "% more damage.";
      var rate = context.cannonRateBonusPercent;
      return "All " + copies + " Cannons " + (finite(rate) && rate > 0 ? "fire " + Math.round(rate) + "% faster." : "share the upgrade.");
    }

    if (!context.inBuild) {
      if (state.stageId === "combat" && context.inputEngaged === false) {
        return guide(context.touch ? "Drag empty space to fly. Your Cannon fires automatically." : "W/S thrust · A/D turn. Your Cannon fires automatically.", "controls");
      }
      if (needsCannon || needsUpgrade) {
        var shortfall = missing(needsCannon ? context.cannonCost : context.cannonUpgradeCost);
        return shortfall ? guide("Defeat enemies for " + shortfall + " more Matter.", null) : guide(result.action, "build");
      }
      if (state.stageId === "upgrades" && progress.upgraded) return guide(improved() + " Try them on the enemies.", null);
      return result;
    }

    if (state.stageId === "combat") return guide("Resume to fly. Your Cannon fires automatically.", "resume");
    if (needsCannon) {
      var cannonShortfall = missing(context.cannonCost);
      if (cannonShortfall) return guide("Resume and earn " + cannonShortfall + " more Matter for a Cannon.", "resume");
      if (context.upgradeWorkspaceOpen === true) return guide("Open Ship layout to attach another Cannon.", "layout-workspace");
      if (context.selectedTileType || context.selectedCatalogType !== "cannon") return guide("Select Cannon in Weapons to add another.", "catalog-cannon");
      if (context.touch && context.pendingPlacement) return guide("Tap the highlighted + again to attach the Cannon.", "placement-pending");
      return guide(context.touch ? "Tap a + cell beside the ship to place the Cannon." : "Click a + cell to attach the Cannon, or drag it there.", "placement");
    }
    if (state.stageId === "construction") return guide("Second Cannon installed. Resume to try both.", "resume");
    if (progress.upgraded) return guide(improved() + " Resume to try them.", "resume");

    var upgradeShortfall = missing(context.cannonUpgradeCost);
    if (upgradeShortfall) return guide("Resume and earn " + upgradeShortfall + " more Matter for the shared upgrade.", "resume");
    if (context.upgradeWorkspaceOpen === false) return guide("Open Upgrade tree to improve both Cannons.", "upgrade-workspace");
    var selectedType = context.selectedTileType || context.selectedCatalogType;
    if (context.upgradeWorkspaceOpen === true && selectedType !== "cannon") return guide("Select Cannon in installed systems to upgrade both copies.", "family-cannon");
    if (selectedType !== "cannon") return guide("Select Cannon in Weapons to see its shared upgrade.", "catalog-cannon");
    return guide("Buy the Cannon upgrade. Every current and future Cannon improves.", "upgrade");
  }

  function create(callbacks) {
    callbacks = callbacks || {};
    var active = false;
    var completed = false;
    var stageIndex = 0;
    var attempt = 1;
    var ledger;

    function resetLedger(context) {
      context = context || {};
      ledger = {
        combat: [], construction: [], upgrades: [],
        boughtCannon: false,
        cannonCopies: count(context.cannonCopies) === null ? 1 : count(context.cannonCopies),
        cannonLevel: count(context.cannonLevel) || 0
      };
    }
    resetLedger();

    function currentId() { return MAIN_IDS[stageIndex]; }
    function upgraded() { return ledger.cannonLevel > 0; }
    function canCreditTrial(id) {
      if (id === "combat") return true;
      if (id === "construction") return ledger.boughtCannon && ledger.cannonCopies >= 2;
      return upgraded() && ledger.cannonCopies >= 2;
    }
    function satisfied(id) { return canCreditTrial(id) && ledger[id].length >= DEFINITIONS[id].setup.targets.length; }

    function progressFor(id) {
      var progress = { destroyed: ledger[id].length, destroyedIds: ledger[id].slice(), required: DEFINITIONS[id].setup.targets.length };
      if (id !== "combat") {
        progress.copies = ledger.cannonCopies;
        progress.upgraded = upgraded();
        progress.cannonLevel = ledger.cannonLevel;
      }
      if (id === "construction") progress.placed = ledger.boughtCannon;
      return progress;
    }

    function actionFor(id) {
      if (completed) return "Training complete.";
      if (id === "combat") return "Fly around the enemies. Your Cannon fires automatically.";
      if (id === "construction") {
        if (!ledger.boughtCannon) return "Open Build and attach a second Cannon.";
        if (ledger.cannonCopies < 2) return "Replace the missing Cannon in Build.";
        return "Try both Cannons against the next enemies.";
      }
      if (ledger.cannonCopies < 2) return "Attach a second Cannon in Build.";
      return upgraded() ? "Fight with your upgraded Cannons." : "Upgrade the Cannon in Build. Both copies improve.";
    }

    function progressText(id) {
      var enemies = ledger[id].length + " / " + DEFINITIONS[id].setup.targets.length + " enemies";
      if (id === "combat") return enemies;
      if (ledger.cannonCopies < 2) return ledger.cannonCopies + " / 2 Cannons";
      if (id === "construction") return ledger.boughtCannon ? ledger.cannonCopies + " Cannons · " + enemies : "Buy a second Cannon";
      return upgraded() ? "Both upgraded · " + enemies : "One upgrade · every Cannon";
    }

    function snapshot() {
      var id = currentId();
      return {
        active: active, stageId: id, stepIndex: stageIndex, stepCount: MAIN_IDS.length, attempt: attempt,
        status: completed ? "complete" : (satisfied(id) ? "success" : "active"), completed: completed,
        title: DEFINITIONS[id].title, action: actionFor(id), progressText: progressText(id),
        progress: progressFor(id), setup: copy(DEFINITIONS[id].setup)
      };
    }

    function changed() { if (callbacks.onChange) callbacks.onChange(snapshot()); }
    function enter(reason) {
      if (callbacks.onStage) callbacks.onStage(snapshot(), reason);
      changed();
    }
    function start(context) {
      active = true;
      completed = false;
      stageIndex = 0;
      attempt = 1;
      resetLedger(context);
      enter("start");
      return snapshot();
    }
    function syncCopies(value) {
      var copies = count(value);
      if (copies !== null) ledger.cannonCopies = copies;
    }
    function syncLevel(value) {
      var level = count(value);
      if (level !== null) ledger.cannonLevel = Math.max(ledger.cannonLevel, level);
    }

    function event(name, details) {
      if (!active || completed) return false;
      details = details || {};
      var before = JSON.stringify(ledger);
      if (name === "target_destroyed") {
        var group = details.group;
        if (MAIN_IDS.indexOf(group) >= 0 && canCreditTrial(group) && !(group === "upgrades" && details.upgraded === false)) {
          var targets = DEFINITIONS[group].setup.targets;
          var known = targets.some(function (target) { return target.id === details.id; });
          if (known && ledger[group].indexOf(details.id) < 0) ledger[group].push(details.id);
        }
      } else if (name === "module_placed" && details.type === "cannon") {
        syncCopies(details.copies);
        if (finite(details.paid) && details.paid > 0 && ledger.cannonCopies >= 2) ledger.boughtCannon = true;
      } else if (name === "module_sold" && details.type === "cannon") {
        syncCopies(details.copies);
      } else if (name === "weapon_upgraded" && details.type === "cannon" && count(details.copies) >= 1) {
        syncCopies(details.copies);
        syncLevel(count(details.level) || 1);
      } else if (name === "ship_state") {
        syncCopies(details.cannonCopies);
        syncLevel(details.cannonLevel);
      }
      if (before === JSON.stringify(ledger)) return false;
      changed();
      return true;
    }

    function advance() {
      if (!active || completed || !satisfied(currentId())) return false;
      if (stageIndex === MAIN_IDS.length - 1) {
        completed = true;
        changed();
        if (callbacks.onComplete) callbacks.onComplete(snapshot());
      } else {
        stageIndex += 1;
        attempt = 1;
        enter("advance");
      }
      return true;
    }

    function retry() {
      if (!active || completed) return false;
      // Death recovery keeps purchases and family power; only this fight is replayed.
      ledger[currentId()] = [];
      attempt += 1;
      enter("retry");
      return true;
    }
    function stop() { active = false; changed(); }

    return { start: start, snapshot: snapshot, event: event, advance: advance, retry: retry, stop: stop };
  }

  return { MAIN_IDS: MAIN_IDS.slice(), stage: stage, create: create, presentation: presentation };
});
