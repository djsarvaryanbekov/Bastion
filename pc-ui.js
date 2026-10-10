(function () {
  "use strict";
  var api = window.DriftPCGame;
  var root = document.getElementById("pcViewport");
  function el(id) { return document.getElementById(id); }
  function element(tag, className, html) { var node = document.createElement(tag); node.className = className; if (html) node.innerHTML = html; return node; }
  function button(id, text, action, className) { var node = element("button", className || "secondary", text); node.id = id; node.type = "button"; node.addEventListener("click", action); return node; }
  document.body.classList.add("pc-game");
  var healthShell = document.querySelector(".health-shell");
  document.querySelector(".hud-stack").prepend(healthShell);
  var coreHudLastActiveAt = performance.now();
  function refreshCoreHealthVisibility(inputActive) {
    if (inputActive) {
      coreHudLastActiveAt = performance.now();
      root.classList.add("pc-core-hud-faded");
      return;
    }
    if (performance.now() - coreHudLastActiveAt >= 5000) root.classList.remove("pc-core-hud-faded");
  }
  var brand = '<span class="pc-brand">DRIFT <b>BASTION</b></span><span class="pc-tagline">MODULAR SPACE SURVIVAL</span>';
  var menu = document.querySelector(".start-screen");
  var title = menu.querySelector(".start-title");
  title.innerHTML = '<p class="eyebrow">SALVAGE / BUILD / ENDURE</p><h1>DRIFT<br><span>BASTION</span></h1><p class="pc-menu-copy">Build your bastion.<br>Survive the next arrival.</p>';
  var hero = element("div", "pc-hero", '<div class="pc-orbit orbit-a"></div><div class="pc-orbit orbit-b"></div><canvas id="pcHeroCanvas" width="800" height="800" aria-label="Selected starting ship"></canvas><div class="pc-hero-caption"><span>01 / FLIGHT READY</span><strong id="pcHeroLoadout"></strong><small>YOUR NEXT BASTION</small></div>');
  menu.prepend(hero);
  var menuMark = element("div", "pc-menu-mark", brand); menu.appendChild(menuMark);
  el("startButton").querySelector("strong").textContent = "Start run";
  document.querySelector(".start-actions").appendChild(button("pcRangeMenu", "Test range <span>↗</span>", function () { api.startRange(); }));
  el("startTrainingButton").textContent = "Training";
  var full = button("pcFullscreen", "⛶ Fullscreen", function () {
    var result = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: "hide" });
    if (result && result.catch) result.catch(function () { full.textContent = "Use F11 for fullscreen"; });
  }, "pc-fullscreen secondary");
  root.appendChild(full);
  el("advancedSettings").appendChild(el("debugBar"));
  var settings = el("settingsContent"), settingsScroll = element("div", "pc-settings-scroll"), settingsNav = element("nav", "pc-settings-nav");
  settingsNav.setAttribute("aria-label", "Settings sections");
  Array.from(settings.children).forEach(function (child) { settingsScroll.appendChild(child); });
  settings.append(settingsNav, settingsScroll);
  var settingsGrid = settingsScroll.querySelector(".settings-grid"), settingsSection;
  Array.from(settingsGrid.children).forEach(function (child) {
    if (child.tagName === "H3") {
      settingsSection = element("section", "pc-settings-section"); settingsGrid.appendChild(settingsSection);
      var target = settingsSection;
      settingsNav.appendChild(button("", child.textContent, function () { target.scrollIntoView({block:"start"}); }, "secondary"));
    }
    settingsSection.appendChild(child);
  });
  settingsNav.appendChild(button("pcAdvancedSettings", "Advanced", function () { el("advancedSettings").open = true; el("advancedSettings").scrollIntoView({block:"start"}); }, "secondary"));
  document.addEventListener("fullscreenchange", function () { full.textContent = document.fullscreenElement ? "⛶ Windowed" : "⛶ Fullscreen"; });
  el("buildButton").innerHTML = '<kbd>B</kbd> Build'; el("pauseButton").innerHTML = '<kbd>Esc</kbd> Pause';
  var nav = document.querySelector(".hangar-tabs");
  var cores = element("section", "hangar-panel hidden"); cores.id = "pcCoresPanel";
  cores.innerHTML = '<div class="pc-section-intro"><p class="eyebrow">CHOOSE YOUR FOUNDATION</p><h3>Starting core</h3><p>Each core has its own permanent ranks. Select one for your next run.</p></div>';
  cores.appendChild(el("corePicker"));
  document.querySelector(".core-section-title").remove();
  el("hangarUpgradesPanel").after(cores);
  el("hangarUpgradeTab").textContent = "Permanent upgrades";
  nav.insertBefore(button("pcCoresTab", "Cores", function () { api.hangarTab("cores"); }, "hangar-tab"), el("hangarUpgradeTab"));
  var research = element("section", "hangar-panel hidden"); research.id = "pcResearchPanel";
  var branches = el("branchList");
  branches.previousElementSibling.remove(); branches.previousElementSibling.remove();
  research.appendChild(branches); cores.after(research);
  nav.appendChild(button("pcResearchTab", "Research", function () { api.hangarTab("research"); }, "hangar-tab"));
  [["hangarWeaponTab","01","Modules","Licenses & loadout"],["pcCoresTab","02","Cores","Choose your foundation"],["hangarUpgradeTab","03","Calibration","Permanent core ranks"],["pcResearchTab","04","Research","Weapon & support branches"]].forEach(function (item) {
    el(item[0]).innerHTML = '<span class="hangar-nav-index">'+item[1]+'</span><strong>'+item[2]+'</strong><small>'+item[3]+'</small>';
  });
  var contextBar = element("div", "pc-hangar-context", '<span>PERMANENT SYSTEMS</span><strong id="pcSelectedCore"></strong><small>FRAGMENTS PURCHASES PERSIST BETWEEN RUNS</small>');
  document.querySelector(".permanent-upgrades").prepend(contextBar);
  var buildHeader = document.querySelector(".build-header");
  var views = element("nav", "pc-build-tabs"); views.setAttribute("aria-label", "Build workspace");
  views.appendChild(button("pcLayoutTab", "Ship layout", function () { setWorkspace(false); }, "selected"));
  views.appendChild(button("pcUpgradesTab", "Upgrade tree", function () { setWorkspace(true); }));
  buildHeader.appendChild(views);
  buildHeader.appendChild(el("closeBuild"));
  document.querySelector(".catalog-wrap h3").textContent = "MODULE LIBRARY";
  var search = element("input", "pc-catalog-search"); search.id = "pcCatalogSearch"; search.placeholder = "Find a module"; search.setAttribute("aria-label", "Find a module");
  document.querySelector(".catalog-wrap").insertBefore(search, el("catalog"));
  search.addEventListener("input", filterCatalog);
  function filterCatalog() {
    var count = 0;
    el("catalog").querySelectorAll(".catalog-card").forEach(function (card) { var match = !search.value || card.textContent.toLowerCase().includes(search.value.toLowerCase()); card.hidden = !match; if (match) count++; });
    el("pcCatalogEmpty").hidden = count > 0;
  }
  var empty = element("p", "pc-empty", "No matching modules"); empty.id = "pcCatalogEmpty"; empty.hidden = true; document.querySelector(".catalog-wrap").appendChild(empty);
  new MutationObserver(filterCatalog).observe(el("catalog"), { childList: true });
  var illustration = element("div", "pc-inspector-art"); illustration.id = "pcInspectorArt";
  document.querySelector(".build-inspector").prepend(illustration);
  function setWorkspace(upgrades) {
    api.clearBuildHover();
    if (upgrades) {
      var build = api.buildState();
      if (build && build.families.length && (!build.installed || build.type === "core")) {
        var family = build.families.find(function (item) { return item.type === build.type; }) || build.families[0];
        api.selectBuildFamily(family.type);
      }
    }
    document.querySelector(".build-panel").classList.toggle("pc-tree-open", upgrades);
    el("pcLayoutTab").classList.toggle("selected", !upgrades); el("pcUpgradesTab").classList.toggle("selected", upgrades);
    el("pcLayoutTab").setAttribute("aria-pressed", String(!upgrades)); el("pcUpgradesTab").setAttribute("aria-pressed", String(upgrades));
    if (upgrades) requestAnimationFrame(function () {
      var track = document.querySelector(".run-upgrade-track");
      if (track) track.scrollTop = Math.max(0, (track.scrollHeight - track.clientHeight) / 2);
    });
  }
  var treeHint = element("section", "pc-tree-hint", "Select an installed module to inspect its upgrade tree.");
  document.querySelector(".build-content").appendChild(treeHint);
  var buildWorkspace = window.DriftBuildWorkspace.mount(api, setWorkspace);
  document.querySelector(".result-panel .button-row").appendChild(button("pcResultsMenu", "Main menu", api.menu));
  var resultPanel = document.querySelector(".result-panel"), resultActions = resultPanel.querySelector(".button-row"), resultScroll = element("div", "pc-results-scroll");
  Array.from(resultPanel.children).forEach(function (child) { if (child !== resultActions) resultScroll.appendChild(child); });
  resultPanel.prepend(resultScroll);
  el("resultExportTelemetry").classList.add("hidden");
  var tools = element("aside", "pc-range-panel hidden", '<p class="eyebrow">LIVE TEST RANGE</p><h2>Systems lab</h2><p class="pc-range-note">Free construction · No progression rewards</p><label for="pcRangeModule">Module</label><select id="pcRangeModule"></select><label for="pcRangeUpgrade">Upgrade configuration</label><select id="pcRangeUpgrade"></select><label for="pcRangeScenario">Scenario</label><select id="pcRangeScenario"></select><div id="pcRangeArt"></div><p id="pcRangeDescription"></p><dl id="pcRangeStats"></dl><p id="pcRangeState" role="status"></p><div class="pc-range-actions"></div>'); tools.id = "pcRangePanel"; root.appendChild(tools);
  Object.keys(api.modules).forEach(function (type) { el("pcRangeModule").add(new Option(api.modules[type].name, type)); });
  api.rangeScenarios.forEach(function (scenario) { el("pcRangeScenario").add(new Option(scenario.name, scenario.id)); });
  var configs = [];
  function configurations(type) {
    configs = api.configurations(type); el("pcRangeUpgrade").replaceChildren();
    configs.forEach(function (config, index) { el("pcRangeUpgrade").add(new Option(config.name, String(index))); });
  }
  el("pcRangeModule").addEventListener("change", function () { api.rangeModule(this.value); configurations(this.value); });
  el("pcRangeUpgrade").addEventListener("change", function () { api.rangeUpgrade(configs[Number(this.value)].state); });
  el("pcRangeScenario").addEventListener("change", function () { api.rangeScenario(this.value); });
  var actions = tools.querySelector(".pc-range-actions");
  actions.appendChild(button("pcRangeBuild", "Build [B]", api.openBuild, "primary"));
  actions.appendChild(button("pcRangePause", "Pause [P]", api.togglePause));
  actions.appendChild(button("pcRangeReset", "Reset scenario", function () { api.rangeScenario(el("pcRangeScenario").value); }));
  actions.appendChild(button("pcRangeLoadout", "Reset loadout", function () { api.rangeModule(el("pcRangeModule").value); configurations(el("pcRangeModule").value); }));
  actions.appendChild(button("pcRangeExit", "← Return", api.leaveRange));
  var lastModule = "", lastHero = "", lastRange = "", lastConfig = "";
  function refresh() {
    var state = api.presentation();
    refreshCoreHealthVisibility(state.inputActive);
    buildWorkspace.refresh();
    if (state.module !== lastModule) { el("pcInspectorArt").innerHTML = api.icon(state.module); lastModule = state.module; }
    el("pcSelectedCore").textContent = state.core;
    document.querySelector(".build-panel").classList.toggle("pc-has-tree", !el("buildUpgradePanel").classList.contains("hidden"));
    full.classList.toggle("hidden", el("menuOverlay").classList.contains("hidden") && !document.querySelector("#pauseOverlay.settings-view:not(.hidden)"));
    var heroKey = state.starter + state.core;
    if (heroKey !== lastHero) { api.drawHero(el("pcHeroCanvas")); el("pcHeroLoadout").textContent = state.core + " / " + api.modules[state.starter].name; lastHero = heroKey; }
    var range = api.rangeState();
    tools.classList.toggle("hidden", !range || range.screen !== "playing");
    root.classList.toggle("pc-range-active", !!range);
    if (range) {
      if (range.type !== lastRange) { el("pcRangeModule").value = range.type; configurations(range.type); el("pcRangeArt").innerHTML = api.icon(range.type); lastRange = range.type; }
      var configKey = JSON.stringify(range.upgrade || null);
      if (configKey !== lastConfig) { var index = configs.findIndex(function (entry) { return JSON.stringify(entry.state) === configKey; }); el("pcRangeUpgrade").value = String(Math.max(0, index)); lastConfig = configKey; }
      el("pcRangeScenario").value = range.scenario;
      el("pcRangeDescription").textContent = api.modules[range.type].description;
      el("pcRangeStats").innerHTML = api.statRows(range.type);
      el("pcRangeState").textContent = range.scenario === "salvage" ? "Collected " + range.collected.toFixed(1) + " Matter · range supplies only" : "Targets return automatically. Reset to restore hull.";
    } else { lastRange = ""; lastConfig = ""; }
  }
  window.addEventListener("keydown", function (event) {
    if (event.code === "Escape") {
      if (!el("pauseOverlay").classList.contains("hidden") && !el("resetProgressConfirm").classList.contains("hidden")) { el("cancelResetProgress").click(); event.preventDefault(); event.stopImmediatePropagation(); }
      else if (!el("buildOverlay").classList.contains("hidden") && document.querySelector(".build-panel").classList.contains("pc-tree-open")) { setWorkspace(false); event.preventDefault(); event.stopImmediatePropagation(); }
      else if (!el("hangarOverlay").classList.contains("hidden")) { api.closeHangar(); event.preventDefault(); event.stopImmediatePropagation(); }
      else if (!el("pauseOverlay").classList.contains("hidden") && el("pauseOverlay").classList.contains("settings-view") && !api.presentation().menuSettings) { api.closeSettings(); event.preventDefault(); event.stopImmediatePropagation(); }
    }
    if (event.code === "Tab") {
      var scope = ["pauseOverlay", "hangarOverlay", "buildOverlay", "resultOverlay", "menuOverlay"].map(el).find(function (node) { return !node.classList.contains("hidden"); });
      if (!scope) return;
      var focusable = Array.from(scope.querySelectorAll("button:not(:disabled), select, input, [tabindex='0']")).filter(function (node) { return node.getClientRects().length && !node.closest("[inert]"); });
      if (!full.classList.contains("hidden")) focusable.push(full);
      if (!focusable.length) return;
      var index = focusable.indexOf(document.activeElement);
      if (index < 0 || (!event.shiftKey && index === focusable.length - 1) || (event.shiftKey && index === 0)) { event.preventDefault(); focusable[event.shiftKey ? focusable.length - 1 : 0].focus(); }
    }
  }, true);
  window.DriftModuleArt.ready.then(function () { lastHero = ""; refresh(); });
  refresh();
  document.body.classList.remove("pc-ui-pending");
  window.setInterval(refresh, 160);
  api.resize();
})();
