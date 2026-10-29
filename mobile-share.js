(function () {
  "use strict";
  var tr = (typeof window !== "undefined" && window.tr) || function (text, vars) { return vars ? text.replace(/\{(\w+)\}/g, function (match, name) { return name in vars ? String(vars[name]) : match; }) : text; };
  var api = window.DriftPCGame;
  // The Android app adds this user-agent token and keeps its window in immersive fullscreen natively.
  var appShell = /\bBastionAndroid\//.test(navigator.userAgent);
  var root = document.documentElement;
  var requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
  var fullscreenSupported = !appShell && Boolean(requestFullscreen) && document.fullscreenEnabled !== false;
  var full = el("pcFullscreen");
  var pauseFull = el("pauseFullscreen");
  var autoBlocked = false;
  var buttonBlocked = false;
  var pending = false;

  function el(id) { return document.getElementById(id); }
  function hidden(id) { return el(id).classList.contains("hidden"); }
  function fullscreenActive() { return Boolean(document.fullscreenElement || document.webkitFullscreenElement); }
  function bareMenu() { return !hidden("menuOverlay") && hidden("pauseOverlay") && hidden("hangarOverlay"); }

  document.body.classList.toggle("app-shell", appShell);
  document.title = "Bastion";

  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {});
    } catch (error) { /* Optional: the rotate notice still covers an upright phone. */ }
  }

  function syncFullscreenUi() {
    var active = fullscreenActive();
    var unavailable = !fullscreenSupported || buttonBlocked || active;
    full.classList.toggle("mobile-fs-off", unavailable || !bareMenu());
    pauseFull.classList.toggle("mobile-fs-off", unavailable);
    document.body.classList.toggle("is-fullscreen", active);
  }

  function enterFullscreen(fromButton) {
    if (!fullscreenSupported || fullscreenActive() || pending) return;
    var refused = function () {
      autoBlocked = true;
      buttonBlocked = buttonBlocked || fromButton;
      syncFullscreenUi();
    };
    pending = true;
    try {
      Promise.resolve(root.requestFullscreen ? root.requestFullscreen({ navigationUI: "hide" }) : requestFullscreen.call(root))
        .then(lockLandscape, refused)
        .finally(function () { pending = false; });
    } catch (error) {
      pending = false;
      refused();
    }
  }

  // Fullscreen needs a real gesture. Every tap or drag end re-enters it after Android's back gesture left it,
  // and never blocks the action the player tapped.
  document.addEventListener("pointerup", function (event) {
    if (event.isTrusted && !autoBlocked) enterFullscreen(false);
  }, true);
  [full, pauseFull].forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopImmediatePropagation();
      enterFullscreen(true);
    }, true);
  });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (name) {
    document.addEventListener(name, function () { syncFullscreenUi(); api.resize(); });
  });
  ["menuOverlay", "pauseOverlay", "hangarOverlay"].forEach(function (id) {
    new MutationObserver(syncFullscreenUi).observe(el(id), { attributes: true, attributeFilter: ["class"] });
  });
  syncFullscreenUi();
  lockLandscape();

  // Landscape only: an upright phone sees a prompt instead of a squeezed game, and a live run pauses.
  var notice = document.createElement("div");
  notice.className = "rotate-notice";
  notice.setAttribute("role", "status");
  notice.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="20" y="8" width="24" height="48" rx="5"/><path d="M29 49h6"/></svg><p></p>';
  notice.querySelector("p").textContent = tr("Turn your phone sideways");
  document.body.appendChild(notice);
  var portrait = window.matchMedia("(hover: none) and (pointer: coarse) and (orientation: portrait)");
  function pauseWhenUpright() {
    if (portrait.matches && window.__driftBastion && window.__driftBastion.getState().screen === "playing") api.togglePause();
  }
  if (portrait.addEventListener) portrait.addEventListener("change", pauseWhenUpright);
  else portrait.addListener(pauseWhenUpright);

  // Android back acts like Escape (pause, close, step back); only the bare main menu lets the app leave.
  window.bastionHandleBack = function () {
    if (bareMenu()) return false;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    return true;
  };
  // The Android app calls this when it leaves the foreground, whatever the auto-pause setting says.
  window.bastionAppHidden = function () {
    if (window.__driftBastion && window.__driftBastion.getState().screen === "playing") api.togglePause();
  };

  // Touch has no B/P keys. The game rewrites these labels at runtime, translated ones keep the same suffix.
  var KEY_HINT = /\s*\[(?:[A-Z]|Esc)\]/g;
  function stripKeyHint(button) {
    var walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    for (var node = walker.nextNode(); node; node = walker.nextNode()) {
      var stripped = node.nodeValue.replace(KEY_HINT, "");
      if (stripped !== node.nodeValue) node.nodeValue = stripped;
    }
  }
  ["resumeButton", "closeBuild", "waveBuildButton", "pcRangeBuild", "pcRangePause", "trainingOpenBuildButton"].forEach(function (id) {
    var button = el(id);
    if (!button) return;
    stripKeyHint(button);
    new MutationObserver(function () { stripKeyHint(button); }).observe(button, { subtree: true, childList: true, characterData: true });
  });

  el("controlHint").querySelector(".touch-control").textContent = tr("Hold & drag to steer · Release to coast");
  el("hud").appendChild(document.querySelector(".health-shell"));

  var rangePanel = el("pcRangePanel");
  var rangeToggle = document.createElement("button");
  rangeToggle.type = "button";
  rangeToggle.className = "mobile-range-toggle secondary hidden";
  rangeToggle.setAttribute("aria-controls", "pcRangePanel");
  el("pcViewport").appendChild(rangeToggle);
  rangePanel.classList.add("mobile-range-collapsed");
  function syncRangeToggle() {
    var collapsed = rangePanel.classList.contains("mobile-range-collapsed");
    rangeToggle.setAttribute("aria-expanded", String(!collapsed));
    rangeToggle.textContent = collapsed ? tr("Systems lab") + " ▾" : tr("Close") + " ▴";
  }
  rangeToggle.addEventListener("click", function () {
    rangePanel.classList.toggle("mobile-range-collapsed");
    syncRangeToggle();
  });
  syncRangeToggle();
  new MutationObserver(function () {
    rangeToggle.classList.toggle("hidden", rangePanel.classList.contains("hidden"));
  }).observe(rangePanel, { attributes: true, attributeFilter: ["class"] });

  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () { api.resize(); });
  api.resize();
})();
