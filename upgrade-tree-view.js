(function (root) {
  "use strict";
  function element(tag, className, text) {
    var node = document.createElement(tag);
    node.className = className || "";
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Reconstruct the paid route for presentation without changing the player's state.
  function routeSteps(upgrades, type, state, base) {
    var tree = upgrades.trees[type];
    var licenses = tree.branches.map(function (branch) { return type + ":" + branch.id; });
    var ids = tree.base.map(function (_, index) { return "base" + (index + 1); });
    (state && state.path || []).forEach(function (id) {
      var branch = tree.branches.find(function (entry) { return entry.id === id; });
      if (branch) branch.steps.forEach(function () { ids.push(id); });
    });
    var current = null;
    return ids.slice(0, state ? state.level : 0).map(function (id) {
      var choice = upgrades.options(type, current, 1, licenses).find(function (entry) { return entry.id === id; });
      if (!choice) return null;
      var result = { name: choice.name, cost: choice.cost, description: base ? upgrades.describeChange(base, current, choice) : "" };
      current = upgrades.nextState(type, current, choice);
      return result;
    }).filter(Boolean);
  }

  function branchSteps(upgrades, type, branch, base) {
    var tree = upgrades.trees[type], path = [], current = branch;
    while (current) {
      path.unshift(current.id);
      current = current.parent ? tree.branches.find(function (entry) { return entry.id === current.parent; }) : null;
    }
    var level = tree.base.length;
    path.forEach(function (id) { level += tree.branches.find(function (entry) { return entry.id === id; }).steps.length; });
    return routeSteps(upgrades, type, { level: level, path: path }, base).slice(-branch.steps.length);
  }

  function renderShop(container, options) {
    var oldViewport = container.querySelector ? container.querySelector(".branch-tree-viewport") : null;
    var scrollLeft = oldViewport && container.dataset.treeWeapon === options.type ? oldViewport.scrollLeft : 0;
    container.dataset.treeWeapon = options.type;
    container.innerHTML = "";
    var upgrades = options.upgrades, type = options.type, tree = upgrades.trees[type];
    var selected = tree.branches.find(function (branch) { return branch.id === options.branch; }) || tree.branches[0];
    var toolbar = element("div", "branch-toolbar");
    var label = element("label", "", "Weapon / support module");
    label.setAttribute("for", "branchWeaponSelect");
    var select = element("select", "branch-weapon-select");
    select.id = "branchWeaponSelect";
    options.types.forEach(function (id) {
      var option = element("option", "", options.definitions[id].name);
      option.value = id; select.appendChild(option);
    });
    select.value = type;
    select.addEventListener("change", function () { options.onType(select.value); });
    toolbar.appendChild(label); toolbar.appendChild(select);
    toolbar.appendChild(element("strong", "branch-wallet", options.fragments + " Fragments"));
    container.appendChild(toolbar);
    var layout = element("div", "branch-shop-layout");
    var viewport = element("div", "branch-tree-viewport");
    viewport.setAttribute("aria-label", "Branch unlock tree; scroll horizontally to explore");
    viewport.setAttribute("tabindex", "0");
    var detail = element("section", "branch-inspect");
    detail.setAttribute("aria-label", "Selected branch details");
    var buttons = [];
    function owned(branch) { return options.licenses.indexOf(type + ":" + branch.id) >= 0; }
    function parentOwned(branch) { return !branch.parent || options.licenses.indexOf(type + ":" + branch.parent) >= 0; }
    function showDetails(branch) {
      selected = branch;
      options.onSelect(branch.id);
      buttons.forEach(function (entry) {
        entry.node.classList.toggle("selected", entry.branch.id === branch.id);
        entry.node.setAttribute("aria-pressed", String(entry.branch.id === branch.id));
      });
      detail.innerHTML = "";
      detail.appendChild(element("span", "tree-eyebrow", "PERMANENT BRANCH UNLOCK"));
      detail.appendChild(element("h4", "", branch.name));
      var status = owned(branch) ? "Owned · Available in every run" : !parentOwned(branch) ? "Requires " + tree.branches.find(function (entry) { return entry.id === branch.parent; }).name + " unlock" : options.activeRun ? "Finish your run before purchasing unlocks" : options.fragments < branch.fragmentCost ? "Need " + (branch.fragmentCost - options.fragments) + " more Fragments" : "Unlock once. Upgrade with Matter during a run.";
      detail.appendChild(element("p", "branch-state", status));
      var buy = element("button", "primary branch-buy", owned(branch) ? "Owned" : "Unlock · " + branch.fragmentCost + " Fragments");
      buy.dataset.unlockBranch = type + ":" + branch.id;
      buy.disabled = owned(branch) || !parentOwned(branch) || options.fragments < branch.fragmentCost || options.activeRun;
      buy.addEventListener("click", function () { if (!buy.disabled) options.onBuy(branch.id); });
      detail.appendChild(buy);
      detail.appendChild(element("p", "branch-step-label", "During a run · Matter per installed copy"));
      branchSteps(upgrades, type, branch, options.definitions[type]).forEach(function (step, index) {
        var row = element("div", "branch-step");
        row.appendChild(element("strong", "", "Rank " + (index + 1) + " · " + step.cost + " Matter"));
        row.appendChild(element("p", "", step.description));
        detail.appendChild(row);
      });
    }
    function lane(branch) {
      var row = element("div", "tree-lane" + (owned(branch) ? " is-owned" : ""));
      var node = element("button", "branch-node" + (owned(branch) ? " owned" : ""));
      node.dataset.branch = type + ":" + branch.id;
      node.appendChild(element("strong", "", branch.name));
      node.appendChild(element("span", "", owned(branch) ? "✓ Owned" : branch.fragmentCost + " Fragments"));
      node.appendChild(element("small", "", owned(branch) ? "Permanent" : parentOwned(branch) ? "Locked · Inspect" : "Requires parent unlock"));
      node.addEventListener("click", function () { showDetails(branch); });
      buttons.push({ node: node, branch: branch }); row.appendChild(node);
      var children = tree.branches.filter(function (entry) { return entry.parent === branch.id; });
      if (children.length) {
        var forks = element("div", "tree-forks");
        children.forEach(function (child) { forks.appendChild(lane(child)); });
        row.appendChild(forks);
      }
      return row;
    }
    var treeRoot = element("div", "tree-lane tree-origin");
    var base = element("div", "branch-node tree-base owned");
    base.appendChild(element("strong", "", options.definitions[type].name));
    base.appendChild(element("span", "", "Base upgrades"));
    base.appendChild(element("small", "", "Available with Matter"));
    treeRoot.appendChild(base);
    var roots = element("div", "tree-forks");
    tree.branches.filter(function (branch) { return !branch.parent; }).forEach(function (branch) { roots.appendChild(lane(branch)); });
    treeRoot.appendChild(roots); viewport.appendChild(treeRoot);
    layout.appendChild(viewport); layout.appendChild(detail); container.appendChild(layout);
    showDetails(selected);
    viewport.scrollLeft = scrollLeft;
  }

  function renderHistory(container, upgrades, type, state) {
    var history = element("div", "upgrade-history");
    var base = element("div", "run-path-node complete", "Base ✓"); history.appendChild(base);
    routeSteps(upgrades, type, state).forEach(function (step) {
      var node = element("div", "run-path-node complete");
      node.appendChild(element("small", "", "PURCHASED ✓"));
      node.appendChild(element("strong", "", step.name.replace(/ [+-][\d.]+%$/, "")));
      history.appendChild(node);
    });
    container.appendChild(history);
  }
  function renderRunTree(container, options) {
    var upgrades = options.upgrades, type = options.type, tree = upgrades.trees[type];
    var state = options.state, level = state ? state.level : 0;
    var licenses = tree.branches.map(function (branch) { return type + ":" + branch.id; });
    var paid = tree.base.map(function (_, index) { return "base" + (index + 1); });
    (state && state.path || []).forEach(function (id) {
      var branch = tree.branches.find(function (entry) { return entry.id === id; });
      if (branch) branch.steps.forEach(function () { paid.push(id); });
    });
    paid = paid.slice(0, level);
    var currentChoices = upgrades.options(type, state, options.copies, options.licenses);
    function children(parentState, path, parentName) {
      var choices = upgrades.options(type, parentState, options.copies, licenses);
      if (!choices.length) return null;
      var forks = element("div", "tree-forks");
      choices.forEach(function (choice) {
        var nextPath = path.concat(choice.id);
        var matches = nextPath.every(function (id, index) { return index >= paid.length || paid[index] === id; });
        var purchased = matches && nextPath.length <= paid.length;
        var available = matches && path.length === paid.length && currentChoices.find(function (entry) { return entry.id === choice.id && entry.rank === choice.rank; });
        var row = element("div", "tree-lane" + (purchased ? " is-owned" : "") + (!matches ? " run-other-route" : ""));
        var node;
        if (available) node = options.createChoice(available);
        else {
          node = element("button", "branch-node run-tree-node" + (purchased ? " owned" : ""));
          node.appendChild(element("small", "tree-eyebrow", purchased ? "PURCHASED ✓" : !matches ? "OTHER ROUTE" : "LATER UPGRADE"));
          node.appendChild(element("strong", "", choice.name.replace(/ [+-][\d.]+%$/, "")));
          if (!purchased) {
            node.appendChild(element("span", "", choice.cost + " Matter"));
            var locked = choice.license && options.licenses.indexOf(choice.license) < 0;
            var branch = locked && tree.branches.find(function (entry) { return type + ":" + entry.id === choice.license; });
            node.appendChild(element("small", "", !matches ? "Not chosen this run" : "Requires " + parentName + (locked ? " · Hangar license: " + branch.fragmentCost + " Fragments" : "")));
          }
          node.type = "button";
          node.title = upgrades.describeChange(options.base, parentState, choice);
          node.setAttribute("aria-expanded", "false");
          node.addEventListener("click", function () {
            var open = node.getAttribute("aria-expanded") !== "true";
            node.setAttribute("aria-expanded", String(open));
            if (!node.querySelector(".pc-node-details")) node.appendChild(element("span", "pc-node-details", node.title));
          });
        }
        node.dataset.treeChoice = choice.id;
        node.dataset.treeRank = String(choice.rank);
        row.appendChild(node);
        var descendants = children(upgrades.nextState(type, parentState, choice), nextPath, choice.name);
        if (descendants) row.appendChild(descendants);
        forks.appendChild(row);
      });
      return forks;
    }
    var root = element("div", "tree-lane tree-origin run-tree");
    var base = element("div", "branch-node tree-base owned");
    base.appendChild(element("strong", "", "Base"));
    base.appendChild(element("small", "", "Installed ✓"));
    root.appendChild(base);
    var branches = children(null, [], "Base");
    if (branches) root.appendChild(branches);
    container.appendChild(root);
  }
  root.DriftUpgradeTreeView = { renderShop: renderShop, renderHistory: renderHistory, renderRunTree: renderRunTree, routeSteps: routeSteps, branchSteps: branchSteps };
})(typeof window !== "undefined" ? window : globalThis);
