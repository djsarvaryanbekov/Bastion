(function (root) {
  "use strict";

  function create(options) {
    options = options || {};
    var hud = document.getElementById("trainingHUD");
    var build = document.getElementById("trainingBuildBar");
    var completion = document.getElementById("trainingCompleteOverlay");
    var current = null;
    var listeners = [];
    var highlighted = null;

    function byId(id) { return document.getElementById(id); }
    function text(id, value) {
      var element = byId(id);
      value = value == null ? "" : String(value);
      if (element && element.textContent !== value) element.textContent = value;
    }
    function visible(element, show) { if (element) element.classList.toggle("hidden", !show); }
    function listen(id, handler) {
      var element = byId(id);
      if (!element) return;
      element.addEventListener("click", handler);
      listeners.push({ element: element, handler: handler });
    }
    function invoke(name) { if (typeof options[name] === "function") options[name](); }
    function highlight(target) {
      if (highlighted) highlighted.classList.remove("training-action-target");
      highlighted = null;
      var selectors = {
        "catalog-cannon": '#catalog .catalog-card[data-type="cannon"]',
        placement: ".build-grid-wrap",
        "placement-pending": "#buildGrid .build-cell.preview-origin",
        upgrade: '#upgradeList .upgrade-option[data-weapon="cannon"]:not(:disabled)',
        "upgrade-workspace": "#pcUpgradesTab", "layout-workspace": "#pcLayoutTab",
        "family-cannon": '.pc-family-card[data-family="cannon"]',
        resume: "#closeBuild", build: "#trainingOpenBuildButton", controls: ".controls-tip"
      };
      if (target && selectors[target] && document.querySelector) highlighted = document.querySelector(selectors[target]);
      if (highlighted) highlighted.classList.add("training-action-target");
    }

    listen("trainingExitButton", function () { invoke("onExit"); });
    listen("trainingBuildExitButton", function () { invoke("onExit"); });
    listen("trainingReturnButton", function () { invoke("onReturn"); });
    listen("trainingPauseButton", function () {
      if (current && !current.inBuild && !current.paused && current.status !== "failed" && !current.completed) invoke("onPause");
    });
    listen("trainingOpenBuildButton", function () {
      if (current && current.allowBuild && !current.inBuild && current.status !== "failed" && !current.completed) invoke("onOpenBuild");
    });
    listen("trainingFailureRetryButton", function () {
      if (current && current.status === "failed") invoke("onRetry");
    });

    function renderPanel(prefix, model) {
      var failed = model.status === "failed";
      text(prefix + "Action", failed ? "Core lost. Try this fight again." : model.action);
      text(prefix + "Progress", failed ? "Your saved progress is unchanged." : model.progressText);
      text(prefix + "Matter", Math.floor(Number(model.matter) || 0));
    }

    function clear() {
      current = null;
      highlight(null);
      visible(hud, false);
      visible(build, false);
      visible(completion, false);
      document.body.classList.remove("training-active", "training-in-build", "training-complete");
    }

    function render(model) {
      if (!model || !model.active) { clear(); return; }
      current = model;
      var finished = Boolean(model.completed || model.status === "complete");
      var failed = model.status === "failed";
      var paused = Boolean(model.paused && !failed);
      highlight(!finished && !failed && !paused ? model.highlightTarget : null);
      if (hud) { hud.dataset.stage = model.stageId || ""; hud.dataset.status = model.status || "active"; }
      if (build) { build.dataset.stage = model.stageId || ""; build.dataset.status = model.status || "active"; }
      document.body.classList.add("training-active");
      document.body.classList.toggle("training-in-build", Boolean(model.inBuild && !finished && !failed));
      document.body.classList.toggle("training-complete", finished);
      visible(hud, (!model.inBuild || failed) && !finished && !paused);
      visible(build, Boolean(model.inBuild && !finished && !paused && !failed));
      visible(completion, finished && !paused);
      renderPanel("training", model);
      renderPanel("trainingBuild", model);
      text("trainingOpenBuildButton", model.buildLabel || "Build");
      var buildButton = byId("trainingOpenBuildButton");
      if (buildButton) buildButton.classList.toggle("primary", Boolean(model.buildHighlighted));
      visible(byId("trainingOpenBuildButton"), Boolean(model.allowBuild && !model.inBuild && !failed && !finished));
      visible(byId("trainingPauseButton"), !failed && !finished);
      visible(byId("trainingFailureRetryButton"), failed);
      text("trainingReturnButton", model.canReturnToRun ? "Return to previous run" : "Back to menu");
    }

    function destroy() {
      clear();
      listeners.forEach(function (entry) { entry.element.removeEventListener("click", entry.handler); });
      listeners.length = 0;
    }
    return { render: render, clear: clear, destroy: destroy };
  }

  root.DriftTrainingView = { create: create };
})(typeof window !== "undefined" ? window : globalThis);
