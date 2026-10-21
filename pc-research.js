(function () {
  "use strict";
  var tr = (typeof window !== "undefined" && window.tr) || function (text, vars) { return vars ? text.replace(/\{(\w+)\}/g, function (match, name) { return name in vars ? String(vars[name]) : match; }) : text; };
  var view = window.DriftUpgradeTreeView;
  var selectedRun = Object.create(null);
  window.DriftPCResearch = {
    captureSelection: function () { return Object.assign({}, selectedRun); },
    restoreSelection: function (value) { selectedRun = Object.assign(Object.create(null), value || {}); }
  };
  function node(tag, css, text) {
    var el = document.createElement(tag); el.className = css || "";
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function button(text, action, css) {
    var el = node("button", css || "secondary", text); el.type = "button";
    el.addEventListener("click", action); return el;
  }
  function art(type) {
    var el = node("div", "research-art");
    el.innerHTML = window.DriftModuleArt.iconHtml(type) || "◈"; return el;
  }
  // Geometry is independent of the upgrade resolver. Every node refers to a real model choice.
  function workspace(container, title, subtitle, entries, inspect, selectedId) {
    var restoreFocus = container.contains(document.activeElement);
    container.replaceChildren(); container.classList.add("research-workspace");
    var head = node("header", "research-header");
    var heading = node("div"); heading.append(node("span", "eyebrow", tr("SYSTEM DEVELOPMENT")), node("h3", "", title), node("p", "", subtitle));
    var controls = node("div", "research-controls"); head.append(heading, controls);
    var body = node("div", "research-body"), viewport = node("div", "research-viewport"), space = node("div", "research-space"), graph = node("div", "research-graph");
    var detail = node("aside", "research-detail"); detail.setAttribute("aria-label", tr("Selected upgrade details"));
    viewport.tabIndex = 0; viewport.setAttribute("aria-label", tr("Upgrade map. Drag empty space to pan. Use zoom controls or Tab to inspect nodes."));
    viewport.append(space); space.append(graph); body.append(viewport, detail); container.append(head, body);
    var byId = Object.create(null), leaves = 0, maxDepth = 0, scale = 1, selectedEntry;
    entries.forEach(function (entry) { byId[entry.id] = entry; entry.children = []; });
    entries.forEach(function (entry) { if (byId[entry.parent]) byId[entry.parent].children.push(entry); });
    function position(entry, depth) {
      entry.depth = depth; maxDepth = Math.max(maxDepth, depth);
      if (entry.children.length) { entry.children.forEach(function (child) { position(child, depth + 1); }); entry.row = (entry.children[0].row + entry.children[entry.children.length - 1].row) / 2; }
      else entry.row = leaves++;
      entry.x = 36 + depth * 220; entry.y = 50 + entry.row * 146;
    }
    entries.filter(function (entry) { return !byId[entry.parent]; }).forEach(function (entry) { position(entry, 0); });
    var width = (maxDepth + 1) * 220 + 60, height = Math.max(280, leaves * 146 + 80);
    graph.style.width = width + "px"; graph.style.height = height + "px";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width); svg.setAttribute("height", height); svg.classList.add("research-links"); graph.append(svg);
    entries.forEach(function (entry) {
      var parent = byId[entry.parent];
      if (parent) {
        var link = document.createElementNS(svg.namespaceURI, "path");
        link.setAttribute("d", "M" + (parent.x + 178) + " " + (parent.y + 45) + " H" + (entry.x - 21) + " V" + (entry.y + 45) + " H" + entry.x);
        link.setAttribute("class", entry.status === "owned" ? "owned" : ""); svg.append(link);
      }
      entry.element = button("", function () { select(entry); }, "research-node " + entry.status);
      entry.element.dataset.researchNode = entry.id;
      entry.element.style.left = entry.x + "px"; entry.element.style.top = entry.y + "px";
      entry.element.append(node("span", "research-node-mark", entry.status === "owned" ? "✓" : entry.status === "ready" ? "＋" : "◇"), node("small", "", entry.stage), node("strong", "", entry.name), node("span", "research-node-cost", entry.cost));
      graph.append(entry.element);
    });
    function select(entry) {
      selectedEntry = entry;
      entries.forEach(function (item) { item.element.classList.toggle("selected", item === entry); item.element.setAttribute("aria-pressed", String(item === entry)); });
      detail.replaceChildren(); inspect(entry, detail, function (id) {
        var required = byId[id];
        if (!required) return;
        select(required);
        viewport.scrollLeft = Math.max(0, required.x * scale - viewport.clientWidth / 3);
        viewport.scrollTop = Math.max(0, required.y * scale - viewport.clientHeight / 2 + 50 * scale);
      });
    }
    function zoom(value) {
      scale = Math.max(.5, Math.min(1.6, value)); graph.style.transform = "scale(" + scale + ")";
      space.style.width = width * scale + "px"; space.style.height = height * scale + "px";
      zoomLabel.textContent = Math.round(scale * 100) + "%";
    }
    function fit() { zoom(Math.min(1, (viewport.clientWidth - 24) / width, (viewport.clientHeight - 24) / height)); viewport.scrollTop = Math.max(0, (height * scale - viewport.clientHeight) / 2); viewport.scrollLeft = 0; }
    var zoomLabel = node("span", "research-zoom", "100%");
    controls.append(node("small", "research-pan-hint", tr("Drag map to pan")),button("−", function () { zoom(scale - .15); }), zoomLabel, button("+", function () { zoom(scale + .15); }), button(tr("Fit tree"), fit));
    var drag = null;
    viewport.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest("button")) return;
      drag = { x:event.clientX, y:event.clientY, left:viewport.scrollLeft, top:viewport.scrollTop }; viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointermove", function (event) { if (drag) { viewport.scrollLeft = drag.left + drag.x - event.clientX; viewport.scrollTop = drag.top + drag.y - event.clientY; } });
    viewport.addEventListener("pointerup", function () { drag = null; });
    viewport.addEventListener("lostpointercapture", function () { drag = null; });
    select(byId[selectedId] || entries.find(function (entry) { return entry.status === "ready" || entry.status === "unaffordable"; }) || entries[0]);
    if (restoreFocus) selectedEntry.element.focus({preventScroll:true});
    function initialView() {
      var compact = window.matchMedia && window.matchMedia("(max-width:760px), (hover:none) and (pointer:coarse)").matches;
      if (compact) {
        // Keep the installed base and its first decision in view before players pan deeper.
        zoom(.78);
        viewport.scrollLeft = 0;
        viewport.scrollTop = Math.max(0, selectedEntry.y * scale - viewport.clientHeight / 2 + 50 * scale);
        return;
      }
      zoom(Math.max(1, parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));
      viewport.scrollTop = Math.max(0, selectedEntry.y * scale - viewport.clientHeight / 2 + 50 * scale);
      viewport.scrollLeft = Math.max(0, selectedEntry.x * scale - viewport.clientWidth / 3);
    }
    // Start at readable text size. Fit is an explicit overview, not the default.
    var fitted = false, observer = new ResizeObserver(function () { if (viewport.clientWidth && viewport.clientHeight && !fitted) { initialView(); fitted = true; } if (!viewport.isConnected) observer.disconnect(); });
    observer.observe(viewport);
    requestAnimationFrame(function () { if (viewport.clientWidth) { initialView(); fitted = true; } });
  }
  function detailHeader(detail, type, label, title, state) {
    detail.append(art(type), node("span", "eyebrow", label), node("h3", "", title), node("p", "research-state", state));
  }
  view.renderShop = function (container, options) {
    var type = options.type, tree = options.upgrades.trees[type], branches = tree.branches;
    function owned(branch) { return options.licenses.includes(type + ":" + branch.id); }
    function permitted(branch) { return !branch.parent || options.licenses.includes(type + ":" + branch.parent); }
    var entries = [{id:"base",name:options.definitions[type].name,stage:tr("FOUNDATION"),status:"owned",cost:tr("Base module")}];
    branches.forEach(function (branch) { entries.push({id:branch.id,parent:branch.parent || "base",name:branch.name,stage:branch.parent ? tr("SPECIALIZATION") : tr("BRANCH LICENSE"),status:owned(branch) ? "owned" : !permitted(branch) ? "locked" : options.fragments < branch.fragmentCost ? "unaffordable" : "ready",cost:owned(branch) ? tr("Licensed") : tr("{cost} Fragments", { cost: branch.fragmentCost }),branch:branch}); });
    workspace(container, options.definitions[type].name, tr("Permanent licenses · Spend Fragments here · Buy ranks with Matter during a run"), entries, function (entry, detail) {
      if (!entry.branch) { detailHeader(detail,type,tr("BASE SYSTEM"),entry.name,tr("The foundation is available. Choose a connected branch to inspect its license and all rank effects.")); return; }
      var branch = entry.branch; options.onSelect(branch.id);
      var state = owned(branch) ? tr("Licensed for every future run.") : !permitted(branch) ? tr("Requires {name} license.", { name: branches.find(function (b) { return b.id === branch.parent; }).name }) : options.activeRun ? tr("Finish the active run to purchase licenses.") : options.fragments < branch.fragmentCost ? tr("Need {count} more Fragments.", { count: branch.fragmentCost - options.fragments }) : tr("Unlock this branch for every future run.");
      detailHeader(detail,type,tr("PERMANENT LICENSE"),branch.name,state);
      var buy = button(owned(branch) ? tr("License owned") : tr("Unlock · {cost} Fragments", { cost: branch.fragmentCost }), function () { options.onBuy(branch.id); }, "primary branch-buy");
      buy.dataset.unlockBranch = type + ":" + branch.id;
      buy.disabled = owned(branch) || !permitted(branch) || options.activeRun || options.fragments < branch.fragmentCost;
      detail.append(buy, node("h4", "", tr("RANK EFFECTS")));
      view.branchSteps(options.upgrades,type,branch,options.definitions[type]).forEach(function (step,index) {
        var row = node("section", "research-effect"); row.append(node("strong","",tr("Rank {rank} / {cost} Matter per copy", { rank: index+1, cost: step.cost })),node("p","",step.description)); detail.append(row);
      });
    }, options.branch);
    var select = node("select"); select.id = "branchWeaponSelect"; select.setAttribute("aria-label", tr("Research module family"));
    options.types.forEach(function (id) { var option = node("option","",options.definitions[id].name); option.value=id; select.append(option); });
    select.value=type; select.addEventListener("change",function(){options.onType(select.value);});
    container.querySelector(".research-controls").prepend(select);
  };
  view.renderRunTree = function (container, options) {
    var upgrades=options.upgrades, type=options.type, tree=upgrades.trees[type];
    var licenses=tree.branches.map(function(b){return type+":"+b.id;}), state=options.state;
    var paid=tree.base.map(function(_,i){return "base"+(i+1);});
    (state && state.path || []).forEach(function(id){tree.branches.find(function(b){return b.id===id;}).steps.forEach(function(){paid.push(id);});});
    paid=paid.slice(0,state ? state.level : 0);
    var current=upgrades.options(type,state,options.copies,options.licenses);
    var entries=[{id:"base",name:options.base.name,stage:tr("INSTALLED"),status:"owned",cost:tr("{count} copies", { count: options.copies })}];
    function walk(parentState,path,parentId,parentName) {
      upgrades.options(type,parentState,options.copies,licenses).forEach(function(choice){
        var route=path.concat(choice.id), id=route.join("/")+":"+choice.rank;
        var matches=route.every(function(item,i){return i>=paid.length || paid[i]===item;});
        var owned=matches && route.length<=paid.length;
        var available=matches && path.length===paid.length && current.find(function(c){return c.id===choice.id && c.rank===choice.rank;});
        var status = owned ? "owned" : available && !available.locked ? !options.free && options.matter < choice.cost ? "unaffordable" : "ready" : !matches ? "excluded" : "locked";
        var stage = owned ? tr("RANK {rank} · PURCHASED", { rank: route.length }) : status === "excluded" ? tr("RANK {rank} · ROUTE CLOSED", { rank: route.length }) : status === "locked" ? tr("RANK {rank} · LOCKED", { rank: route.length }) : tr("RANK {rank}", { rank: route.length });
        entries.push({id:id,parent:parentId,name:choice.name.replace(/ [+-][\d.]+%$/,""),stage:stage,status:status,cost:owned?tr("Installed"):options.free?tr("Free in range"):tr("{cost} Matter", { cost: choice.cost }),choice:choice,available:available,before:parentState,requires:parentName});
        walk(upgrades.nextState(type,parentState,choice),route,id,choice.name);
      });
    }
    walk(null,[],"base",tr("Base module"));
    workspace(container,options.base.name,(options.copies === 1 ? tr("Run upgrades · {count} installed copy · Also applies to future copies", { count: options.copies }) : tr("Run upgrades · {count} installed copies · Also applies to future copies", { count: options.copies })),entries,function(entry,detail,selectNode){
      selectedRun[type] = entry.id;
      var missingLicense = entry.choice && entry.choice.license && !options.licenses.includes(entry.choice.license);
      var license = missingLicense ? tree.branches.find(function(branch){return type + ":" + branch.id === entry.choice.license;}) : null;
      var prerequisite = entry.choice && !entry.available && entry.status !== "owned" && entry.status !== "excluded";
      var reason = entry.status === "excluded"
        ? tr("Unavailable · Different upgrade route chosen")
        : entry.status === "owned"
          ? (!current.length ? tr("Route complete") : entry.choice ? tr("Purchased") : tr("Installed"))
          : prerequisite ? tr("Requires {name}", { name: entry.requires })
          : missingLicense ? tr("Locked · Hangar license required")
          : entry.status === "unaffordable" ? tr("Insufficient Matter") : tr("Ready to upgrade");
      if (license && !prerequisite && entry.status === "locked") reason = tr("Hangar → Research · {cost} Fragments · Between runs", { cost: license.fragmentCost });
      detailHeader(detail,type,entry.status === "locked" ? tr("LOCKED") : tr("THIS RUN"),entry.name,reason);
      if (prerequisite) detail.append(button(tr("View prerequisite") + " →", function(){selectNode(entry.parent);}, "secondary research-prerequisite"));
      if (license && entry.status !== "owned" && entry.status !== "excluded") {
        var licenseHelp = prerequisite ? tr("Hangar license · {cost} Fragments · Between runs", { cost: license.fragmentCost }) : "";
        if (license.parent) {
          var parentLicense = tree.branches.find(function(branch){return branch.id === license.parent;});
          if (!options.licenses.includes(type + ":" + license.parent)) licenseHelp += (licenseHelp ? " · " : "") + tr("{name} license first", { name: parentLicense.name });
        }
        if (licenseHelp) detail.append(node("p", "research-warning", licenseHelp));
      }
      if (!entry.choice) return;
      var effects = node("div", "research-stat-list");
      upgrades.describeChange(options.base,entry.before,entry.choice).split(" · ").forEach(function(effect) {
        var row = node("div", "research-stat-row"), colon = effect.indexOf(":");
        if (colon < 0) row.append(node("span", "", effect));
        else row.append(node("span", "", effect.slice(0,colon)),node("strong", "", effect.slice(colon+1).trim()));
        effects.append(row);
      });
      detail.append(effects);
      if (!options.free && entry.status !== "excluded") {
        var inheritedCost = upgrades.investment(type,entry.status === "owned" ? options.state : entry.before);
        if (entry.status !== "owned") inheritedCost += entry.choice.unitCost;
        var pricing = node("p","research-cost",entry.status === "owned" ? "" :
          (options.copies === 1 ? tr("{unit} × {count} copy = {cost} Matter", { unit: entry.choice.unitCost, count: options.copies, cost: entry.choice.cost }) : tr("{unit} × {count} copies = {cost} Matter", { unit: entry.choice.unitCost, count: options.copies, cost: entry.choice.cost })));
        if (entry.status !== "owned") pricing.append(node("br"));
        pricing.append(node("span","research-state",entry.status === "owned"
          ? tr("Future copies: +{cost} Matter in upgrades", { cost: inheritedCost })
          : tr("After upgrade: copies +{cost} Matter", { cost: inheritedCost })));
        detail.append(pricing);
      }
      // Only genuine purchase actions use a button. Locked data stays plain text.
      if (entry.available && !entry.available.locked) {
        var purchase = options.createChoice(entry.available);
        purchase.replaceChildren(document.createTextNode(options.free ? tr("Apply upgrade") : tr("Upgrade · {cost} Matter", { cost: entry.available.cost })));
        purchase.classList.add("research-purchase");
        detail.append(purchase);
      } else if (entry.status !== "owned" && (options.free || entry.status === "excluded")) detail.append(node("p","research-cost",options.copies === 1 ? tr("{cost} · {count} copy", { cost: entry.cost, count: options.copies }) : tr("{cost} · {count} copies", { cost: entry.cost, count: options.copies })));
    },selectedRun[type]);
  };
})();
