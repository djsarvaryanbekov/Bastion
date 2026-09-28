(function (root) {
  "use strict";

  function create(options) {
    options = options || {};
    var definitions = options.definitions || {};
    var ids = ["modulePreviewDialog", "modulePreviewTitle", "modulePreviewCanvas", "modulePreviewSummary", "modulePreviewStats", "modulePreviewStatus", "modulePreviewActionSlot", "modulePreviewClose", "modulePreviewReplay", "modulePreviewPlayPause"];
    var ui = {};
    ids.forEach(function (id) {
      ui[id] = document.getElementById(id);
      if (!ui[id]) throw new Error("Module preview markup is missing: " + id);
    });
    if (!root.DriftModulePreview) throw new Error("Module preview scene is unavailable.");
    var scene = root.DriftModulePreview.create({ canvas: ui.modulePreviewCanvas, definitions: definitions, drawIcon: options.drawIcon });
    var motionQuery = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var opened = false;
    var disposed = false;
    var currentType = null;
    var currentContext = null;
    var playing = false;
    var actionToken = null;
    var actionBusy = false;
    var actionState = null;
    var returnFocus = null;
    var background = [];
    var previousOverflow = "";
    var listeners = [];

    function listen(element, event, handler, capture) {
      element.addEventListener(event, handler, Boolean(capture));
      listeners.push({ element: element, event: event, handler: handler, capture: Boolean(capture) });
    }
    function focus(element) { if (element && typeof element.focus === "function") element.focus({ preventScroll: true }); }
    function canFocus(element) {
      if (!element || element.isConnected === false || element.disabled) return false;
      if (element.closest && element.closest(".hidden, [hidden], [inert]")) return false;
      return !element.getClientRects || element.getClientRects().length > 0;
    }
    function focusableElements() {
      return Array.prototype.filter.call(ui.modulePreviewDialog.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"), canFocus);
    }
    function rememberFocus() {
      var element = document.activeElement;
      returnFocus = { element: element, id: element && element.id, attributes: [] };
      if (!element || !element.getAttribute) return;
      ["data-module", "data-type", "data-preview"].forEach(function (name) {
        var value = element.getAttribute(name);
        if (value !== null) returnFocus.attributes.push({ name: name, value: value });
      });
    }
    function restoreFocus() {
      var saved = returnFocus;
      returnFocus = null;
      if (!saved) return;
      if (canFocus(saved.element)) { focus(saved.element); return; }
      var target = saved.id ? document.getElementById(saved.id) : null;
      if (canFocus(target)) { focus(target); return; }
      for (var index = 0; index < saved.attributes.length; index += 1) {
        var attribute = saved.attributes[index];
        var matches = document.querySelectorAll("[" + attribute.name + "]");
        for (var match = 0; match < matches.length; match += 1) {
          if (matches[match].getAttribute(attribute.name) === attribute.value && canFocus(matches[match])) { focus(matches[match]); return; }
        }
      }
    }
    function lockBackground() {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      background = Array.prototype.filter.call((document.getElementById("pcViewport") || document.body).children, function (element) {
        return element !== ui.modulePreviewDialog && !element.contains(ui.modulePreviewDialog);
      }).map(function (element) {
        var entry = { element: element, inert: element.inert };
        element.inert = true;
        return entry;
      });
    }
    function unlockBackground() {
      background.forEach(function (entry) { entry.element.inert = entry.inert; });
      background = [];
      document.body.style.overflow = previousOverflow;
    }
    function updatePlayControl() {
      ui.modulePreviewPlayPause.textContent = playing ? "Pause preview" : "Play preview";
      ui.modulePreviewPlayPause.setAttribute("aria-label", playing ? "Pause module preview" : "Play module preview");
      ui.modulePreviewPlayPause.setAttribute("aria-pressed", String(playing));
    }
    function setPlaying(value) {
      if (!opened) return;
      scene.setPlaying(Boolean(value));
      syncPlayback();
    }
    function syncPlayback() {
      playing = opened && Boolean(scene.snapshot().playing);
      updatePlayControl();
    }
    function showDescription() {
      var description = scene.describe(currentType) || {};
      var definition = definitions[currentType];
      ui.modulePreviewTitle.textContent = description.title || definition.name || currentType;
      ui.modulePreviewSummary.textContent = description.summary || definition.summary || "";
      ui.modulePreviewCanvas.setAttribute("aria-label", (description.title || definition.name || currentType) + " mechanic preview");
      ui.modulePreviewStats.innerHTML = "";
      (description.stats || []).slice(0, 3).forEach(function (value) {
        var item = document.createElement("li");
        item.textContent = value.label + " " + value.value;
        ui.modulePreviewStats.appendChild(item);
      });
    }
    function renderAction(state) {
      var previous = document.getElementById("modulePreviewAction");
      var hadFocus = previous && document.activeElement === previous;
      actionToken = null;
      ui.modulePreviewActionSlot.innerHTML = "";
      actionState = {
        kind: state.actionKind === "buy" || state.actionKind === "starter" ? state.actionKind : null,
        label: String(state.actionLabel || ""), disabled: Boolean(state.actionDisabled)
      };
      ui.modulePreviewActionSlot.classList.toggle("hidden", !actionState.kind);
      if (!actionState.kind) { if (hadFocus) focus(ui.modulePreviewClose); return; }
      var button = document.createElement("button");
      button.id = "modulePreviewAction";
      button.type = "button";
      button.className = "module-preview-button module-preview-primary";
      button.textContent = actionState.label || (actionState.kind === "buy" ? "Unlock" : "Use as starter");
      button.disabled = actionState.disabled;
      var token = { type: currentType, kind: actionState.kind, used: false };
      actionToken = token;
      button.addEventListener("click", function (event) {
        if (!opened || actionBusy || actionToken !== token || token.used || currentType !== token.type || button.disabled || (event && event.detail > 1)) return;
        token.used = true;
        button.disabled = true;
        actionBusy = true;
        try {
          if (typeof options.onAction === "function") options.onAction(token.type, token.kind);
        } finally {
          actionBusy = false;
          if (opened && actionToken === token) refresh();
        }
      });
      ui.modulePreviewActionSlot.appendChild(button);
      if (hadFocus) focus(button.disabled ? ui.modulePreviewClose : button);
    }
    function refresh() {
      if (!opened || disposed) return false;
      var state = typeof options.getState === "function" ? options.getState(currentType, currentContext) || {} : {};
      ui.modulePreviewStatus.textContent = String(state.status || "");
      ui.modulePreviewStatus.classList.toggle("hidden", !state.status);
      renderAction(state);
      syncPlayback();
      return true;
    }
    function open(type, context) {
      if (disposed || !Object.prototype.hasOwnProperty.call(definitions, type)) return false;
      if (!opened) {
        rememberFocus();
        opened = true;
        ui.modulePreviewDialog.classList.remove("hidden");
        lockBackground();
      }
      currentType = type;
      currentContext = context;
      scene.show(type);
      playing = Boolean(scene.snapshot().playing);
      updatePlayControl();
      showDescription();
      refresh();
      focus(ui.modulePreviewClose);
      return true;
    }
    function close() {
      if (!opened) return false;
      opened = false;
      playing = false;
      actionToken = null;
      actionState = null;
      scene.hide();
      ui.modulePreviewDialog.classList.add("hidden");
      unlockBackground();
      try {
        if (typeof options.onClose === "function") options.onClose();
      } finally { restoreFocus(); }
      return true;
    }
    function snapshot() {
      var sceneState = scene.snapshot();
      return { open: opened, type: currentType, context: currentContext, playing: opened && Boolean(sceneState.playing),
        actionKind: actionState ? actionState.kind : null, actionLabel: actionState ? actionState.label : "", actionDisabled: actionState ? actionState.disabled : true,
        scene: sceneState };
    }
    function destroy() {
      if (disposed) return;
      try { close(); } finally {
        disposed = true;
        ui.modulePreviewActionSlot.innerHTML = "";
        listeners.forEach(function (entry) { entry.element.removeEventListener(entry.event, entry.handler, entry.capture); });
        listeners.length = 0;
        scene.destroy();
      }
    }

    listen(ui.modulePreviewClose, "click", close);
    listen(ui.modulePreviewReplay, "click", function () {
      if (!opened) return;
      scene.show(currentType);
      setPlaying(true);
    });
    listen(ui.modulePreviewPlayPause, "click", function () { setPlaying(!scene.snapshot().playing); });
    if (motionQuery && motionQuery.addEventListener) listen(motionQuery, "change", syncPlayback);
    listen(document, "keydown", function (event) {
      if (!opened) return;
      if (event.key === "Escape" || event.code === "Escape") {
        event.preventDefault(); event.stopPropagation(); close(); return;
      }
      if (event.repeat && (event.key === "Enter" || event.key === " ") && event.target === document.getElementById("modulePreviewAction")) {
        event.preventDefault(); return;
      }
      if (event.key !== "Tab" && event.code !== "Tab") return;
      var items = focusableElements();
      var current = items.indexOf(document.activeElement);
      if (!items.length) { event.preventDefault(); focus(ui.modulePreviewDialog); return; }
      if (event.shiftKey && current <= 0) { event.preventDefault(); focus(items[items.length - 1]); }
      else if (!event.shiftKey && (current < 0 || current === items.length - 1)) { event.preventDefault(); focus(items[0]); }
    }, true);
    listen(document, "focusin", function (event) {
      if (opened && !ui.modulePreviewDialog.contains(event.target)) focus(ui.modulePreviewClose);
    }, true);

    return { open: open, close: close, refresh: refresh, isOpen: function () { return opened; }, snapshot: snapshot, destroy: destroy };
  }

  root.DriftModulePreviewPanel = { create: create };
})(typeof window !== "undefined" ? window : globalThis);
