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
