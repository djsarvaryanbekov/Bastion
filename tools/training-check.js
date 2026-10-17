"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const training = require("../training.js");

function destroy(controller, group, ids, extra) {
  ids.forEach(id => controller.event("target_destroyed", Object.assign({ group, id }, extra)));
}
function clearCombat(controller) {
  destroy(controller, "combat", ["combat-1", "combat-2", "combat-3"]);
  assert.equal(controller.advance(), true);
  assert.equal(controller.snapshot().stageId, "construction");
}
function buyCannon(controller) { controller.event("module_placed", { type: "cannon", paid: 19, copies: 2 }); }

const transitions = [], completions = [];
const controller = training.create({ onStage: (state, reason) => transitions.push([state.stageId, reason]), onComplete: state => completions.push(state) });
const profile = Object.freeze({ cannonCopies: 1, cannonLevel: 0 });
controller.start(profile);
assert.deepEqual(training.MAIN_IDS, ["combat", "construction", "upgrades"]);
assert.deepEqual(Object.keys(controller).sort(), ["advance", "event", "retry", "snapshot", "start", "stop"]);
assert.equal(controller.snapshot().stageId, "combat", "Training starts in the fight without a movement gate");
assert.equal(controller.advance(), false);
for (let i = 0; i < 100; i++) controller.event("tick", { elapsed: i * 600 });
assert.equal(controller.snapshot().status, "active", "Elapsed time cannot earn trial credit");
controller.event("beacon_entered", { id: "move-1" });
controller.event("target_destroyed", { group: "unrelated", id: "combat-1" });
controller.event("target_destroyed", { group: "combat", id: "unknown" });
assert.equal(controller.snapshot().progress.destroyed, 0);
destroy(controller, "combat", ["combat-1", "combat-1"]);
assert.deepEqual(controller.snapshot().progress.destroyedIds, ["combat-1"], "A real marked enemy counts once");

// Buying and upgrading during the first fight stays valid in later stages.
buyCannon(controller);
controller.event("weapon_upgraded", { type: "cannon", copies: 2, level: 1 });
destroy(controller, "combat", ["combat-2", "combat-3"]);
assert.equal(controller.snapshot().status, "success");
assert.equal(controller.snapshot().stageId, "combat", "A kill callback must not mutate the arena or advance the stage");
assert.equal(controller.advance(), true, "The engine advances once it reaches its safe update boundary");
assert.equal(controller.snapshot().stageId, "construction");
assert.equal(controller.snapshot().progress.placed, true);
assert.equal(controller.snapshot().progress.upgraded, true);
assert.equal(controller.snapshot().progress.cannonLevel, 1);
assert.equal(controller.snapshot().status, "active", "A purchase needs a real flight trial");
assert.equal(controller.snapshot().action, "Try both Cannons against the next enemies.");
assert.equal(controller.advance(), false);
controller.event("ship_state", { cannonCopies: 1, cannonLevel: 1 });
destroy(controller, "construction", ["construction-1"]);
assert.equal(controller.snapshot().progress.destroyed, 0);
assert.equal(controller.snapshot().action, "Replace the missing Cannon in Build.");
assert.equal(controller.snapshot().progressText, "1 / 2 Cannons", "Missing weapons show the purchase objective instead of an uncredited enemy counter");
controller.event("ship_state", { cannonCopies: 2, cannonLevel: 1 });
destroy(controller, "construction", ["construction-1", "construction-1"]);
assert.equal(controller.snapshot().progress.destroyed, 1);
controller.retry();
assert.equal(controller.snapshot().attempt, 2);
assert.equal(controller.snapshot().progress.destroyed, 0);
assert.equal(controller.snapshot().progress.placed, true, "Death recovery does not require buying the same Cannon again");
assert.equal(controller.snapshot().progress.cannonLevel, 1);
destroy(controller, "construction", ["construction-1", "construction-2"]);
controller.event("ship_state", { cannonCopies: 1 });
assert.equal(controller.advance(), false, "Losing the second Cannon before the update boundary requires a replacement");
controller.event("ship_state", { cannonCopies: 2 });
assert.equal(controller.advance(), true);
assert.equal(controller.snapshot().stageId, "upgrades");
assert.equal(controller.snapshot().progress.upgraded, true, "An early upgrade is already paid for");
assert.equal(controller.snapshot().action, "Fight with your upgraded Cannons.");
controller.event("target_destroyed", { group: "upgrades", id: "upgrades-1", upgraded: false });
assert.equal(controller.snapshot().progress.destroyed, 0);
destroy(controller, "upgrades", ["upgrades-1", "upgrades-2"], { upgraded: true });
assert.equal(controller.snapshot().status, "success");
assert.equal(completions.length, 0);
assert.equal(controller.advance(), true);
assert.equal(controller.snapshot().status, "complete");
assert.equal(controller.snapshot().completed, true);
assert.equal(completions.length, 1);
assert.equal(controller.advance(), false);
assert.equal(controller.retry(), false, "Completed training has no replay-task loop");
assert.equal(controller.event("weapon_upgraded", { type: "cannon", copies: 2, level: 2 }), false);
assert.equal(completions.length, 1);

const external = controller.snapshot();
external.setup.targets[0].hp = 9999;
external.progress.destroyedIds.length = 0;
assert.equal(controller.snapshot().setup.targets[0].hp, 72);
assert.equal(controller.snapshot().progress.destroyed, 2);
controller.stop();
assert.equal(controller.snapshot().active, false);
assert.equal(controller.advance(), false);
assert.deepEqual(profile, { cannonCopies: 1, cannonLevel: 0 }, "The controller never changes the supplied context");

const fresh = training.create();
fresh.start();
clearCombat(fresh);
assert.equal(fresh.snapshot().progressText, "1 / 2 Cannons");
fresh.retry();
assert.equal(fresh.snapshot().progress.placed, false, "Retry cannot manufacture a purchase");
fresh.event("module_placed", { type: "cannon", paid: 0, copies: 2 });
destroy(fresh, "construction", ["construction-1", "construction-2"]);
assert.equal(fresh.snapshot().progress.destroyed, 0, "Free fixtures do not teach a paid second weapon");
assert.equal(fresh.snapshot().progressText, "Buy a second Cannon", "Even two free fixtures cannot display a trial counter before the paid purchase");
fresh.event("module_placed", { type: "cannon", paid: 19, copies: 1 });
assert.equal(fresh.snapshot().progress.placed, false);
buyCannon(fresh);
assert.equal(fresh.snapshot().progress.destroyed, 0, "Kills before buying are not retroactively credited");
assert.equal(fresh.snapshot().progressText, "2 Cannons · 0 / 2 enemies", "Enemy trial progress appears only after the purchase qualifies");
destroy(fresh, "construction", ["construction-1"]);
fresh.event("module_sold", { type: "cannon", paid: 19, refund: 9, copies: 1 });
destroy(fresh, "construction", ["construction-2"]);
assert.equal(fresh.snapshot().progress.destroyed, 1);
buyCannon(fresh);
destroy(fresh, "construction", ["construction-2"]);
fresh.advance();
assert.equal(fresh.snapshot().stageId, "upgrades");
assert.equal(fresh.snapshot().action, "Upgrade the Cannon in Build. Both copies improve.");
assert.equal(fresh.snapshot().progressText, "One upgrade · every Cannon");
destroy(fresh, "upgrades", ["upgrades-1", "upgrades-2"], { upgraded: true });
assert.equal(fresh.snapshot().progress.destroyed, 0, "Unpurchased upgrades cannot earn trial credit");
assert.equal(fresh.snapshot().progressText, "One upgrade · every Cannon", "Free fighting before an upgrade does not expose a counter that seems broken");
fresh.event("weapon_upgraded", { type: "cannon", copies: 1, level: 1 });
destroy(fresh, "upgrades", ["upgrades-1"], { upgraded: true });
assert.equal(fresh.snapshot().progress.destroyed, 0, "Upgraded trial requires two installed Cannons");
assert.equal(fresh.snapshot().progressText, "1 / 2 Cannons");
buyCannon(fresh);
assert.equal(fresh.snapshot().progress.upgraded, true, "Future copies inherit the earlier family purchase");
assert.equal(fresh.snapshot().progressText, "Both upgraded · 0 / 2 enemies");
destroy(fresh, "upgrades", ["upgrades-1"], { upgraded: true });
fresh.retry();
assert.equal(fresh.snapshot().progress.destroyed, 0);
assert.equal(fresh.snapshot().progress.upgraded, true, "Death recovery preserves the family upgrade");
destroy(fresh, "upgrades", ["upgrades-1", "upgrades-2"], { upgraded: true });
assert.equal(fresh.advance(), true);

for (const id of training.MAIN_IDS) {
  const definition = training.stage(id);
  assert.ok(definition.setup.targets.every(target => target.hp === 72));
  assert.equal(definition.setup.targetGroup, id);
  assert.equal(definition.setup.spawnAfterPlacement, undefined, "Enemies remain available before purchases");
  assert.equal(definition.setup.spawnAfterUpgrade, undefined, "The upgrade objective does not create an empty field");
  assert.equal(definition.setup.fundAction, undefined, "The controller does not top up Matter between stages");
}
assert.equal(training.stage("movement"), null);
assert.equal(training.stage("editing"), null);
assert.equal(training.stage("shield"), null);
assert.equal(training.stage("toString"), null);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const oldUi = /id="training(?:Build)?(?:ContinueButton|PracticeButton|PracticeMenu|StepText|Explanation|EditingButton|ShieldButton|ResumeMainButton)"/;
assert.equal(oldUi.test(html), false, "The previous tutorial menus and step/Continue interface are removed");
const completionTag = html.match(/<section[^>]+id="trainingCompleteOverlay"[^>]*>/);
assert.ok(completionTag, "Completion is a compact section, not a blocking dialog");
assert.doesNotMatch(completionTag[0], /aria-modal|role="dialog"|class="overlay/);
assert.match(html, /id="trainingFailureRetryButton"/);
assert.doesNotMatch(html, /id="training(?:Build)?RetryButton"/, "Retry is available for core loss only");

const learning = training.create();
learning.start();
const afford = Object.freeze({ inBuild: true, selectedCatalogType: "cannon", selectedTileType: null,
  matter: 100, cannonCost: 19, cannonUpgradeCost: 32, cannonRateBonusPercent: 25 });
const untouchedContext = JSON.stringify(afford);
let cue = training.presentation(learning.snapshot(), { inputEngaged: false, touch: false });
assert.match(cue.action, /W\/S thrust.*A\/D turn/);
assert.equal(cue.highlightTarget, "controls");
cue = training.presentation(learning.snapshot(), { inputEngaged: false, touch: true });
assert.match(cue.action, /Drag empty space/);
assert.equal(learning.snapshot().progress.destroyed, 0, "Showing controls never earns movement or kill credit");
assert.equal(training.presentation(learning.snapshot(), afford).highlightTarget, "resume");
clearCombat(learning);
const beforeGuidance = JSON.stringify(learning.snapshot());
function guide(extra) { return training.presentation(learning.snapshot(), Object.assign({}, afford, extra)); }
assert.equal(guide().highlightTarget, "placement");
assert.equal(guide({ upgradeWorkspaceOpen: true }).highlightTarget, "layout-workspace");
assert.match(guide().action, /Click a \+ cell/);
assert.equal(guide({ selectedTileType: "cannon" }).highlightTarget, "catalog-cannon", "Inspecting an installed Cannon does not expose attachment cells");
assert.equal(guide({ selectedTileType: "shield" }).highlightTarget, "catalog-cannon");
assert.equal(guide({ selectedCatalogType: "armor" }).highlightTarget, "catalog-cannon");
assert.equal(guide({ matter: 5 }).highlightTarget, "resume");
assert.match(guide({ matter: 5 }).action, /14 more Matter/);
assert.match(guide({ touch: true }).action, /Tap a \+ cell/);
assert.equal(guide({ touch: true, pendingPlacement: true }).highlightTarget, "placement-pending");
assert.match(guide({ touch: true, pendingPlacement: true }).action, /again/);
assert.equal(guide({ inBuild: false, matter: 5 }).buildHighlighted, false, "An unaffordable action does not keep demanding Build");
assert.match(guide({ inBuild: false, matter: 5 }).action, /14 more Matter/);
assert.equal(guide({ inBuild: false }).highlightTarget, "build");
assert.equal(JSON.stringify(learning.snapshot()), beforeGuidance, "Context hints never select, purchase, place, or advance anything");
assert.equal(JSON.stringify(afford), untouchedContext);
buyCannon(learning);
assert.equal(guide().highlightTarget, "resume");
assert.match(guide().action, /Second Cannon installed/);
destroy(learning, "construction", ["construction-1", "construction-2"]);
learning.advance();
assert.equal(guide().highlightTarget, "upgrade");
assert.equal(guide({ upgradeWorkspaceOpen: false }).highlightTarget, "upgrade-workspace");
assert.equal(guide({ upgradeWorkspaceOpen: true }).highlightTarget, "upgrade");
assert.equal(guide({ upgradeWorkspaceOpen: true, selectedTileType: "shield" }).highlightTarget, "family-cannon");
assert.equal(guide({ selectedTileType: "cannon" }).highlightTarget, "upgrade");
assert.equal(guide({ selectedTileType: "shield" }).highlightTarget, "catalog-cannon", "An installed nonweapon inspector does not show a Cannon upgrade");
assert.match(guide({ matter: 9 }).action, /23 more Matter/);
assert.equal(guide({ matter: 9 }).highlightTarget, "resume");
assert.equal(guide({ inBuild: false }).buildLabel, "Upgrade [B]");
learning.event("weapon_upgraded", { type: "cannon", copies: 2, level: 1 });
assert.equal(guide().highlightTarget, "resume");
assert.match(guide().action, /All 2 Cannons fire 25% faster/);
assert.match(guide({ inBuild: false }).action, /All 2 Cannons fire 25% faster.*Try/);
assert.match(guide({ cannonRateBonusPercent: 37.5 }).action, /38% faster/, "The improvement uses the actual host value, not a fixed first-upgrade assumption");
assert.doesNotMatch(guide({ cannonRateBonusPercent: undefined }).action, /25%/, "Missing rate data cannot fabricate a numeric upgrade");
learning.event("ship_state", { cannonCopies: 1 });
assert.equal(guide().highlightTarget, "placement", "A lost second Cannon calls for its replacement despite an existing family upgrade");
assert.equal(guide({ paused: true }).highlightTarget, null);
learning.stop();
assert.equal(guide().highlightTarget, null);

// A context cue follows replaced Build DOM nodes and never moves focus or captures input.
function viewElement() {
  const classes = new Set();
  return { dataset: {}, textContent: "", listeners: {},
    classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, show) => show ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) },
    addEventListener: function (event, fn) { this.listeners[event] = fn; },
    removeEventListener: function (event) { delete this.listeners[event]; },
    focus: () => assert.fail("Guidance must not take focus") };
}
const viewElements = new Map();
let target = viewElement();
const viewDocument = { body: viewElement(), getElementById: id => {
  if (!viewElements.has(id)) viewElements.set(id, viewElement());
  return viewElements.get(id);
}, querySelector: () => target };
const viewGlobal = { document: viewDocument };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "training-view.js"), "utf8"), viewGlobal);
const learningView = viewGlobal.DriftTrainingView.create();
const viewModel = { active: true, inBuild: true, status: "active", highlightTarget: "placement", action: "Place a Cannon." };
learningView.render(viewModel);
assert.equal(target.classList.contains("training-action-target"), true);
const detachedTarget = target;
target = viewElement();
learningView.render(viewModel);
assert.equal(detachedTarget.classList.contains("training-action-target"), false);
assert.equal(target.classList.contains("training-action-target"), true);
learningView.render(Object.assign({}, viewModel, { paused: true }));
assert.equal(target.classList.contains("training-action-target"), false);
learningView.render(viewModel);
learningView.clear();
assert.equal(target.classList.contains("training-action-target"), false);
learningView.destroy();

console.log(JSON.stringify({ passed: true, checks: [
  "Three fight stages; no marker route, optional practice, or Continue API",
  "Only real distinct enemy kills qualify, with paid construction and shared upgrade conditions",
  "Stage changes wait for the engine's safe advance call",
  "Early purchases and future-copy upgrades stay credited",
  "Death recovery resets only the current fight, preserving purchases",
  "All stages supply comparable72HP enemy data immediately without budget topups",
  "Completion is emitted once; pure controller has no save or game mutations",
  "Training markup has one objective, no task/Continue menus, and a nonmodal result",
  "Context guidance follows selection, affordability, touch confirmation, and actual family improvement without changing play state",
  "Context highlights follow replaced DOM and clear on pause/exit without taking focus"
], transitions }, null, 2));
