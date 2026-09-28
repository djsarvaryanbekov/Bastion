(function () {
  "use strict";
  var FAST_PURCHASE_WINDOW_MS = 250;
  var selected = { cores:null, ranks:null };
  function el(tag, css, text) { var item=document.createElement(tag);item.className=css||"";if(text!==undefined)item.textContent=text;return item; }
  // Reuse the engine-owned action buttons, so prices, transactions and guards have one owner.
  function decorate(container,kind) {
    var lastRankClick = null;
    var restoreFocus = container.dataset.restoreFocus === "true";
    var buttons=Array.from(container.children).filter(function(item){return item.tagName==="BUTTON"&&!item.classList.contains("hidden");});
    if(!buttons.length)return;
    var items=buttons.map(function(button,index){return {button:button,id:button.dataset.core||button.dataset.meta||String(index),title:button.querySelector("strong").textContent,description:button.querySelector("small").textContent,action:button.querySelector(kind==="cores"?".core-state":".meta-price").textContent,selected:button.classList.contains("selected")};});
    container.replaceChildren(); container.classList.add("systems-workspace");
    var list=el("nav","systems-list"),hero=el("section","systems-hero"),detail=el("section","systems-detail");
    list.setAttribute("aria-label",kind==="cores"?"Core models":"Permanent systems");
    container.append(list,hero,detail);
    function show(item) {
      selected[kind]=item.id;
      items.forEach(function(entry){entry.selector.classList.toggle("selected",entry===item);entry.selector.setAttribute("aria-pressed",String(entry===item));});
      hero.replaceChildren(); detail.replaceChildren();
      var image=el("div","systems-core-art");image.innerHTML=window.DriftModuleArt.iconHtml("core");
      hero.append(el("span","eyebrow",kind==="cores"?"CORE ASSEMBLY":"PERMANENT CALIBRATION"),image,el("strong","",item.title),el("p","",kind==="cores"?"The foundation of your next bastion.":"Applied to the selected core on future runs."));
      detail.append(el("span","eyebrow",kind==="cores"?"CORE SPECIFICATION":"SYSTEM EFFECT"),el("h3","",item.title),el("p","systems-description",item.description));
      if (kind === "cores") {
        var core = window.DriftCampaign.getCore(item.id), stats = el("dl","systems-stats");
        [["Module hull",core.moduleHpMultiplier],["Movement",core.speedMultiplier],["Reload time",core.cooldownMultiplier],["Matter income",core.matterMultiplier]].forEach(function (stat) { stats.append(el("dt","",stat[0]),el("dd","",Math.round(stat[1]*100)+"%")); });
        detail.append(stats);
      }
      if(kind==="ranks") {
        var match=item.title.match(/(\d+)\/(\d+)/), ranks=el("div","systems-ranks");
        for(var i=0;i<25;i++){var pip=el("i",match&&i<Number(match[1])?"owned":"");ranks.append(pip);}detail.append(ranks);
      }
      var note=kind==="cores"?"Each core keeps its own permanent upgrade ranks.":"Fragments purchase · Permanent · Selected core only";
      detail.append(el("p","systems-note",note));
      item.button.className="primary systems-action"; item.button.textContent=item.action.replace(/ F$/, " Fragments");
      detail.append(item.button);
      if(item.button.disabled)detail.append(el("p","research-warning",item.button.dataset.reason || "This upgrade is retained from an earlier profile."));
    }
    items.forEach(function(item,index){
      var selector=el("button","systems-selector");selector.type="button";
      selector.append(el("span","systems-index",String(index+1).padStart(2,"0")),el("strong","",item.title),el("small","",item.selected?"EQUIPPED":kind==="cores"?"INSPECT CORE":"INSPECT UPGRADE"));
      if (kind === "ranks") selector.title = "Quick double-click to buy one rank";
      selector.addEventListener("click",function(event){
        show(item);
        if (kind !== "ranks") return;
        var now = performance.now();
        // Require a native mouse double-click as well as our tighter timing window.
        var quickDoubleClick = event.button === 0 && event.detail === 2 &&
          lastRankClick && lastRankClick.id === item.id &&
          now - lastRankClick.time <= FAST_PURCHASE_WINDOW_MS;
        lastRankClick = event.button === 0 && event.detail === 1 ? {id:item.id,time:now} : null;
        if (quickDoubleClick && !item.button.disabled) item.button.click();
      });
      item.selector=selector;list.append(selector);
    });
    show(items.find(function(item){return item.id===selected[kind];})||items.find(function(item){return item.selected;})||items[0]);
    if (restoreFocus) container.querySelector('.systems-selector.selected').focus({preventScroll:true});
  }
  window.DriftPCSystems={cores:function(container){decorate(container,"cores");},ranks:function(container){decorate(container,"ranks");}};
})();
