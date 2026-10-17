(function () {
  "use strict";
  function element(tag, className, text) {
    var node = document.createElement(tag);
    node.className = className || "";
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function mount(api, setWorkspace) {
    var panel = document.querySelector(".build-panel");
    var catalog = document.querySelector(".catalog-wrap");
    var heading = catalog.querySelector("h3");
    var families = element("nav", "pc-installed-families");
    families.id = "pcInstalledFamilies";
    families.setAttribute("aria-label", "Installed module families");
    catalog.appendChild(families);
    var guide = element("section", "pc-build-guide");
    guide.id = "pcBuildGuide";
    guide.setAttribute("aria-label", "Current build action");
    var copy = element("div");
    var mode = element("small", "eyebrow");
    var title = element("strong");
    var instruction = element("p");
    copy.append(mode, title, instruction);
    guide.append(copy);
    document.querySelector(".build-stage").prepend(guide);
    var viewport = document.querySelector(".build-grid-wrap");
    var grid = document.getElementById("buildGrid");
    var zoomControls = element("div", "pc-build-zoom");
    zoomControls.setAttribute("role", "group");
    zoomControls.setAttribute("aria-label", "Ship layout zoom");
    var zoomLabel = element("output", "pc-build-zoom-label");
    zoomLabel.id = "pcBuildZoomLabel";
    var autoFit = true;
    var cellSize = 88;
    function zoomButton(id, label, text, action) {
      var control = element("button", "secondary", text);
      control.id = id;
      control.type = "button";
      control.setAttribute("aria-label", label);
      control.addEventListener("click", action);
      return control;
    }
    var zoomOut = zoomButton("pcBuildZoomOut", "Zoom out ship layout", "−", function () { changeZoom(-1); });
    var zoomIn = zoomButton("pcBuildZoomIn", "Zoom in ship layout", "+", function () { changeZoom(1); });
    var fit = zoomButton("pcBuildFit", "Fit entire ship and attachment cells", "Fit ship", function () { autoFit = true; fitLayout(); });
    zoomControls.append(zoomOut, zoomLabel, zoomIn, fit);
    guide.appendChild(zoomControls);
    function changeZoom(direction) {
      autoFit = false;
      cellSize = Math.max(12, Math.min(128, Math.round(cellSize * (direction > 0 ? 1.2 : 1 / 1.2))));
      fitLayout();
      var core = grid.querySelector('.build-cell[data-x="0"][data-y="0"]');
      if (!core) return;
      var bounds = viewport.getBoundingClientRect(), center = core.getBoundingClientRect();
      viewport.scrollLeft += (center.left + center.right - bounds.left - bounds.right) / 2;
      viewport.scrollTop += (center.top + center.bottom - bounds.top - bounds.bottom) / 2;
    }
    function fitLayout() {
      var state = api.buildState();
      if (!state || state.dragging || panel.classList.contains("pc-tree-open") || !viewport.clientWidth || !viewport.clientHeight) return;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      Array.from(grid.children).forEach(function (cell) {
        var x = Number(cell.dataset.x), y = Number(cell.dataset.y);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
      if (!Number.isFinite(minX)) return;
      var columns = maxX - minX + 1, rows = maxY - minY + 1;
      if (autoFit) {
        var outer = getComputedStyle(viewport), inner = getComputedStyle(grid);
        var width = viewport.clientWidth - parseFloat(outer.paddingLeft) - parseFloat(outer.paddingRight) - parseFloat(inner.paddingLeft) - parseFloat(inner.paddingRight);
        var height = viewport.clientHeight - parseFloat(outer.paddingTop) - parseFloat(outer.paddingBottom) - parseFloat(inner.paddingTop) - parseFloat(inner.paddingBottom);
        var gapX = parseFloat(inner.columnGap) || 0, gapY = parseFloat(inner.rowGap) || 0;
        cellSize = Math.max(12, Math.min(88, Math.floor(Math.min((width - gapX * (columns - 1)) / columns, (height - gapY * (rows - 1)) / rows))));
      }
      grid.style.setProperty("--pc-cell", cellSize + "px");
      grid.style.gridTemplateColumns = "repeat(" + columns + ", var(--pc-cell))";
      zoomLabel.textContent = Math.round(cellSize / 88 * 100) + "%";
      fit.setAttribute("aria-pressed", String(autoFit));
      zoomOut.disabled = cellSize <= 12;
      zoomIn.disabled = cellSize >= 128;
      if (autoFit) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    }
    var fitScheduled = false;
    function scheduleFit() {
      if (fitScheduled) return;
      fitScheduled = true;
      requestAnimationFrame(function () { fitScheduled = false; fitLayout(); });
    }
    // Only grid structure changes refit; hovering a ghost must not move its destination.
    new MutationObserver(scheduleFit).observe(grid, { childList: true });
    new ResizeObserver(scheduleFit).observe(viewport);
    var treeButton = element("button", "primary", "Upgrade this family →");
    treeButton.id = "pcOpenFamilyTree";
    treeButton.type = "button";
    treeButton.addEventListener("click", function () { setWorkspace(true); refresh(); });
    document.getElementById("buildModuleDetails").after(treeButton);
    var hint = document.querySelector(".pc-tree-hint");
    hint.replaceChildren(element("strong", "", "No installed module families"), element("p", "", "Attach a module in Ship layout. Its family will appear here, ready to inspect and upgrade with Matter."));
    var back = element("button", "primary", "Open ship layout");
    back.type = "button";
    back.addEventListener("click", function () { setWorkspace(false); refresh(); });
    hint.appendChild(back);
    window.addEventListener("blur", function (event) { if (event.target === window) api.suspendBuildHover(); }, true);
    window.addEventListener("focus", api.resumeBuildHover);
    document.addEventListener("visibilitychange", function () { if (document.hidden) api.suspendBuildHover(); else api.resumeBuildHover(); }, true);
    var previous = "";
    function refresh() {
      var state = api.buildState();
      if (!state) { previous = ""; return; }
      if (state.dragging) return;
      fitLayout();
      var tree = panel.classList.contains("pc-tree-open");
      var key = JSON.stringify(state) + tree;
      if (key === previous) return;
      previous = key;
      heading.textContent = tree ? "INSTALLED SYSTEMS" : "MODULE LIBRARY";
      document.getElementById("buildHint").textContent = tree
        ? "Choose an installed family on the left, then inspect a node. Return to Ship layout to add or remove modules."
        : "Library: choose a new copy · Ship: inspect installed modules · Upgrades: improve an installed family";
      var focusedType = families.contains(document.activeElement) ? document.activeElement.dataset.family : null;
      families.replaceChildren();
      families.appendChild(element("p", "pc-family-help", "Select a family below. Upgrades affect every installed copy and future copies during this run."));
      state.families.forEach(function (family) {
        var item = element("button", "pc-family-card" + (state.type === family.type ? " selected" : ""));
        item.type = "button";
        item.dataset.family = family.type;
        item.setAttribute("aria-pressed", String(state.type === family.type));
        var art = element("span", "pc-family-art");
        art.innerHTML = api.icon(family.type);
        var label = element("span", "pc-family-label");
        label.append(element("strong", "", api.modules[family.type].name), element("small", "", family.count + (family.count === 1 ? " installed copy" : " installed copies")), element("small", "", family.rank));
        item.append(art, label);
        item.addEventListener("click", function () { api.selectBuildFamily(family.type); refresh(); item = families.querySelector('[data-family="' + family.type + '"]'); if (item) item.focus({preventScroll:true}); });
        families.appendChild(item);
        if (focusedType === family.type) item.focus({preventScroll:true});
      });
      treeButton.hidden = !state.installed || state.type === "core";
      var name = state.type === "core" ? "Core" : api.modules[state.type].name;
      mode.textContent = state.installed ? "INSPECT INSTALLED MODULE" : "ADD A MODULE";
      title.textContent = state.installed ? name + " selected" : "Place " + name;
      instruction.textContent = state.installed
        ? (state.type === "core" ? "The core anchors your ship. Select another installed module to upgrade it, or choose a library item to add a copy." : "Upgrade this family from the inspector. Removing a module gives no refund and must keep the ship connected.")
        : "Choose a + beside the ship to attach a copy, or drag it from the library. Click an installed module to inspect it.";
    }
    return { refresh: refresh };
  }
  window.DriftBuildWorkspace = { mount: mount };
})();
