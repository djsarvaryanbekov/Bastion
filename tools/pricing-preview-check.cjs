"use strict";

const fs = require("node:fs"), vm = require("node:vm");
const {assert,U,MODULES,runtime} = require("./balance-fixture");
const document = runtime.document;
const originalCreate = document.createElement.bind(document);

// Add the DOM operations used by the real desktop inspector to the existing harness.
function decorate(element) {
  let text = element.textContent || "";
  Object.defineProperty(element,"textContent",{configurable:true,
    get(){return text + this.children.map(child=>child.textContent || "").join("");},
    set(value){text=String(value);this.children=[];}});
  element.appendChild = function (child) { child.parentNode=this;this.children.push(child);return child; };
  element.append = function (...children) { children.forEach(child=>this.appendChild(child)); };
  element.prepend = function (...children) { children.forEach(child=>{child.parentNode=this;});this.children.unshift(...children); };
  element.replaceChildren = function (...children) {
    this.children.forEach(child=>{child.parentNode=null;});this.children=[];text="";this.append(...children);
  };
  element.contains = function (child) { return Boolean(child)&&(child===this||this.children.some(item=>item.contains&&item.contains(child))); };
  element.focus = function () { document.activeElement=this; };
  element.querySelectorAll = function (selector) { return descendants(this).filter(node=>matches(node,selector)); };
  element.querySelector = function (selector) { return this.querySelectorAll(selector)[0] || null; };
  return element;
}
function descendants(element) {
  return element.children.flatMap(child=>[child,...descendants(child)]);
}
function hasClass(element,name) {
  return String(element.className||"").split(/\s+/).includes(name)||element.classList.contains(name);
}
function matches(element,selector) {
  return selector.startsWith(".") ? hasClass(element,selector.slice(1)) : element.tagName===selector.toUpperCase();
}
document.createElement = tag=>{const element=decorate(originalCreate(tag));element.tagName=tag.toUpperCase();return element;};
document.createElementNS = (namespace,tag)=>{const element=document.createElement(tag);element.namespaceURI=namespace;return element;};
document.createTextNode = text=>{const element=document.createElement("#text");element.textContent=text;return element;};
runtime.DriftModuleArt = {iconHtml(){return "";}};
runtime.ResizeObserver = class { observe() {} disconnect() {} };
runtime.getComputedStyle = ()=>({fontSize:"16px"});
const sourcePath = process.argv[2] || "pc-research.js";
let researchSource = fs.readFileSync(sourcePath,"utf8");
if (/\.html?$/i.test(sourcePath)) {
  const scripts = Array.from(researchSource.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi),match=>match[1])
    .filter(script=>script.includes("window.DriftPCResearch ="));
  assert.equal(scripts.length,1,"Expected one desktop research script in standalone HTML");
  researchSource = scripts[0];
}
vm.runInNewContext(researchSource,runtime,{filename:sourcePath});

const checks = [];
function check(name,run) { run();checks.push(name); }
function stateFor(type,choices) {
  const data = {}, licenses = U.trees[type].branches.map(branch=>type+":"+branch.id);
  choices.forEach(id=>assert.ok(U.purchase(data,type,id,100000,1,undefined,licenses)));
  return data[type];
}
function render(state,{type="cannon",copies=4,licenses=U.trees[type].branches.map(branch=>type+":"+branch.id),free=false,matter=1000}={}) {
  runtime.DriftPCResearch.restoreSelection({});
  const container = document.createElement("div");
  const data = {}, transactions = [];
  if(state)data[type]=JSON.parse(JSON.stringify(state));
  const options = {upgrades:U,type,base:MODULES[type],state,copies,licenses,free,matter,
    createChoice(choice) {
      const button=document.createElement("button");button.textContent="Legacy price content";
      button.disabled=!free&&options.matter<choice.cost;
      button.addEventListener("click",()=>{
        if(button.disabled)return;
        const before=options.matter;
        const result=U.purchase(data,type,choice.id,free?Number.MAX_SAFE_INTEGER:before,copies,choice.rank,licenses);
        assert.ok(result);if(!free)options.matter=result.matter;
        transactions.push({spent:before-options.matter,state:data[type]});
      });
      return button;
    }};
  const before = JSON.stringify({state,trees:U.trees,definitions:MODULES,licenses});
  runtime.DriftUpgradeTreeView.renderRunTree(container,options);
  assert.equal(JSON.stringify({state,trees:U.trees,definitions:MODULES,licenses}),before,"Inspecting prices must preserve the economy model");
  return {container,transactions,detail(){return container.querySelector(".research-detail");},
    select(id) {
      const node=descendants(container).find(element=>element.dataset.researchNode===id);
      assert.ok(node,"Missing upgrade node "+id);node.listeners.click();
    }};
}
function pricing(view) { return view.detail().querySelector(".research-cost"); }
function buyButton(view) { return view.detail().querySelector(".research-purchase"); }

check("Four-copy upgrade shows unit arithmetic and charges the unchanged total",()=>{
  const view=render(null);
  assert.match(pricing(view).textContent,/8 × 4 copies = 32 Matter/);
  assert.match(pricing(view).textContent,/After upgrade: copies \+8 Matter/);
  assert.doesNotMatch(pricing(view).textContent,/Future copies:/,"An unpurchased rank cannot imply its surcharge is already active");
  assert.equal(buyButton(view).textContent,"Upgrade · 32 Matter");
  buyButton(view).listeners.click();
  assert.equal(view.transactions.length,1);assert.equal(view.transactions[0].spent,32);
  assert.equal(U.investment("cannon",view.transactions[0].state),8);
});
check("Single-copy grammar and another family use their real unit costs",()=>{
  const single=render(null,{copies:1});
  assert.match(pricing(single).textContent,/8 × 1 copy = 8 Matter/);
  const scatter=render(null,{type:"scatter",copies:3});
  assert.match(pricing(scatter).textContent,/10 × 3 copies = 30 Matter/);
  assert.match(pricing(scatter).textContent,/After upgrade: copies \+10 Matter/);
});
check("Selected upgrade previews cumulative inherited investment",()=>{
  const view=render(stateFor("cannon",["base1"]));
  assert.match(pricing(view).textContent,/18 × 4 copies = 72 Matter/);
  assert.match(pricing(view).textContent,/After upgrade: copies \+26 Matter/);
  assert.equal(buyButton(view).textContent,"Upgrade · 72 Matter");
});
check("Later locked-route preview includes its prerequisite investment",()=>{
  const view=render(stateFor("cannon",["base1","base2"]),{licenses:["cannon:twin"]});
  view.select("base1/base2/twin/twin/focus:4");
  assert.match(pricing(view).textContent,/81 × 4 copies = 324 Matter/);
  assert.match(pricing(view).textContent,/After upgrade: copies \+188 Matter/);
  assert.equal(buyButton(view),null,"Locked previews cannot purchase");
});
check("Owned earlier ranks show the current inherited surcharge",()=>{
  const view=render(stateFor("cannon",["base1","base2","twin"]));
  view.select("base1:0");
  assert.equal(pricing(view).textContent,"Future copies: +62 Matter in upgrades");
  assert.equal(buyButton(view),null);
});
check("An excluded route does not pretend to change future-copy prices",()=>{
  const view=render(stateFor("cannon",["base1","base2","twin"]));
  view.select("base1/base2/pierce:2");
  assert.match(view.detail().textContent,/Different upgrade route chosen/);
  assert.doesNotMatch(view.detail().textContent,/Future copies:|After upgrade:/);
  assert.equal(buyButton(view),null);
});
check("Unaffordable previews retain accurate math and disabled purchase",()=>{
  const view=render(null,{matter:20});
  assert.match(pricing(view).textContent,/8 × 4 copies = 32 Matter/);
  assert.equal(buyButton(view).disabled,true);buyButton(view).listeners.click();
  assert.equal(view.transactions.length,0);
});
check("Free Test Range hides all paid arithmetic and inheritance prices",()=>{
  const view=render(null,{free:true});
  assert.equal(buyButton(view).textContent,"Apply upgrade");
  assert.doesNotMatch(view.container.textContent,/Matter|Future copies:|After upgrade:/);
  view.select("base1/base2/twin/twin/focus:4");
  assert.match(view.detail().textContent,/Free in range/);
  assert.doesNotMatch(view.container.textContent,/Matter|Future copies:|After upgrade:/);
});
console.log(JSON.stringify({passed:true,source:sourcePath,checks},null,2));
