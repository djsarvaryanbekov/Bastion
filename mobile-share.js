(function () {
  "use strict";
  var button = document.getElementById("pcFullscreen");
  button.textContent = "⛶ Fullscreen";
  button.setAttribute("aria-label", "Enter fullscreen");
  var attempted = false;
  var pending = false;

  function fullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function unavailable() {
    button.textContent = "Open in browser for fullscreen";
    button.setAttribute("aria-label", "Fullscreen blocked here. Open this HTML in your browser.");
  }

  function enterFullscreen() {
    if (fullscreenActive() || pending) return;
    var root = document.documentElement;
    var request = root.requestFullscreen || root.webkitRequestFullscreen;
    attempted = true;
    if (!request) { unavailable(); return; }
    pending = true;
    try {
      Promise.resolve(root.requestFullscreen ? request.call(root, { navigationUI: "hide" }) : request.call(root))
        .catch(unavailable).finally(function () { pending = false; });
    } catch (error) { pending = false; unavailable(); }
  }

  // Fullscreen requires a real gesture; never block the action the player tapped.
  document.addEventListener("click", function (event) {
    if (event.isTrusted && !attempted) enterFullscreen();
  }, true);
  button.addEventListener("click", function (event) {
    event.stopImmediatePropagation();
    enterFullscreen();
  }, true);
  function updateFullscreen() {
    button.textContent = fullscreenActive() ? "⛶ Fullscreen" : "⛶ Enter fullscreen";
    window.DriftPCGame.resize();
  }
  document.addEventListener("fullscreenchange", updateFullscreen);
  document.addEventListener("webkitfullscreenchange", updateFullscreen);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () { window.DriftPCGame.resize(); });
  document.querySelector("#controlHint .touch-control").textContent = "Hold & drag to steer · Release to coast";
  document.querySelector(".settings-controls").textContent = "Hold & drag to steer · Release to coast. Use + to Build and Ⅱ to pause.";
  document.getElementById("hud").appendChild(document.querySelector(".health-shell"));
  ["closeBuild", "pcRangeBuild", "pcRangePause"].forEach(function (id) {
    var control = document.getElementById(id);
    control.textContent = control.textContent.replace(/\s*\[[BP]\]/g, "");
  });
  var rangePanel = document.getElementById("pcRangePanel");
  var rangeToggle = document.createElement("button");
  rangeToggle.type = "button";
  rangeToggle.className = "mobile-range-toggle secondary hidden";
  rangeToggle.textContent = "Lab ▾";
  rangeToggle.setAttribute("aria-controls", "pcRangePanel");
  rangeToggle.setAttribute("aria-expanded", "false");
  document.getElementById("pcViewport").appendChild(rangeToggle);
  rangePanel.classList.add("mobile-range-collapsed");
  rangeToggle.addEventListener("click", function () {
    var collapsed = rangePanel.classList.toggle("mobile-range-collapsed");
    rangeToggle.setAttribute("aria-expanded", String(!collapsed));
    rangeToggle.textContent = collapsed ? "Lab ▾" : "Close lab ▴";
  });
  new MutationObserver(function () {
    rangeToggle.classList.toggle("hidden", rangePanel.classList.contains("hidden"));
  }).observe(rangePanel, { attributes:true, attributeFilter:["class"] });
  document.title = "Drift Bastion — Mobile Playtest";
  window.DriftPCGame.resize();
})();
