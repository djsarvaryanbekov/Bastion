(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DriftRunUpgrades=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
var tr = (typeof window !== "undefined" && window.tr) || function (text, vars) { return vars ? text.replace(/\{(\w+)\}/g, function (match, name) { return name in vars ? String(vars[name]) : match; }) : text; };
// Each branch stage replaces its predecessor relative to the fully upgraded base.
var trees={};
function step(name,cost,set,multiply){return {name:name,cost:cost,set:set||{},multiply:multiply||{}};}
function family(type,prices,special){
 var defaults=[step(tr('Damage +15%'),prices[0],{},type==='ember'?{damage:1.15,burnDamage:1.15}:{damage:1.15}),step(tr('Fire rate +15%'),prices[1],{},{cooldown:1/1.15})];
 trees[type]={base:special||defaults,branches:[]};
}
function branch(type,id,name,prices,changes,parent){
 trees[type].branches.push({id:id,name:name,parent:parent||null,fragmentCost:parent?80:64,steps:prices.map(function(cost,i){return step(tr('{name} {stage}',{name:name,stage:i+1}),cost,changes[i].set,changes[i].multiply);})});
}
family('cannon',[8,18]);family('scatter',[10,21]);family('missile',[16,36]);family('laser',[14,30]);family('rail',[20,45]);family('arc',[14,33]);family('pulse',[14,33]);family('mine',[10,24]);family('ember',[12,27]);
family('cryo',[12,27],[step(tr('Slow lasts 2.5s'),12,{slowDuration:2.5}),step(tr('Fire rate +15%'),27,{},{cooldown:1/1.15})]);
family('flak',[12,27],[step(tr('Intercept radius 140'),12,{blastRadius:140}),step(tr('Fire rate +15%'),27,{},{cooldown:1/1.15})]);
family('gravity',[16,36],[step(tr('Field lasts 2.5s'),16,{fieldDuration:2.5}),step(tr('Field radius 115'),36,{fieldRadius:115})]);
family('shield',[14,30],[step(tr('Shield capacity 75'),14,{shield:75}),step(tr('Recharge 4/s'),30,{rechargeRate:4})]);
family('repair',[12,27],[step(tr('Repair 6 HP'),12,{repairAmount:6}),step(tr('Repair every 1.25s'),27,{repairInterval:1.25})]);
family('reactor',[],[step(tr('Local fire rate +30%'),18,{cooldownBonus:.30}),step(tr('Local fire rate +35%'),41,{cooldownBonus:.35}),step(tr('Local fire rate +40%'),68,{cooldownBonus:.4})]);
family('armor',[],[step(tr('150 HP'),4,{hp:150}),step(tr('180 HP'),9,{hp:180}),step(tr('220 HP'),15,{hp:220})]);
family('bulkhead',[],[step(tr('210 HP'),6,{hp:210}),step(tr('250 HP'),14,{hp:250}),step(tr('300 HP'),21,{hp:300})]);
family('collector',[],[step(tr('First Siphon +12%'),12,{matterBonus:.12}),step(tr('First Siphon +14%'),30,{matterBonus:.14}),step(tr('First Siphon +16%'),48,{matterBonus:.16})]);
branch('cannon','twin',tr('Twin volley'),[36,45],[{set:{shots:2},multiply:{damage:.75}},{set:{shots:3},multiply:{damage:.65}}]);
branch('cannon','fan',tr('Fan volley'),[72],[{set:{shots:5,volleySpread:.12},multiply:{damage:.55}}],'twin');
branch('cannon','focus',tr('Focused volley'),[81],[{set:{shots:4},multiply:{damage:.7}}],'twin');
branch('cannon','pierce',tr('Piercing shot'),[42,51],[{set:{penetration:2}},{set:{penetration:3}}]);
branch('cannon','through',tr('Through fire'),[90],[{set:{penetration:5},multiply:{damage:.75}}],'pierce');
branch('cannon','impact',tr('Impact round'),[81],[{set:{penetration:2,secondHitScale:7/18},multiply:{damage:1.8,cooldown:1.15}}],'pierce');
branch('scatter','cone',tr('Buckshot'),[39,51],[{set:{pellets:9,spread:.5},multiply:{damage:.75}},{set:{pellets:11,spread:.5},multiply:{damage:.75}}]);
branch('scatter','double',tr('Double blast'),[84],[{set:{pellets:11,spread:.5,burstCount:2,burstInterval:.15},multiply:{damage:.75,cooldown:1.5}}],'cone');
branch('scatter','focus',tr('Tight pattern'),[45,57],[{set:{range:300,spread:.18}},{set:{range:340,spread:.12,pellets:7}}]);
branch('missile','salvo',tr('Missile salvo'),[72,90],[{set:{shots:2},multiply:{damage:.7}},{set:{shots:3},multiply:{damage:.6}}]);
branch('missile','distribute',tr('Distributed targets'),[144],[{set:{shots:4,distributeTargets:true},multiply:{damage:.55}}],'salvo');
branch('missile','focus',tr('Focused barrage'),[162],[{set:{shots:4},multiply:{damage:.65,cooldown:1.15}}],'salvo');
branch('missile','heavy',tr('Heavy warhead'),[78,96],[{set:{blastRadius:100},multiply:{damage:1.6}},{set:{blastRadius:120},multiply:{damage:2,cooldown:1.25}}]);
branch('missile','cluster',tr('Cluster warhead'),[180],[{set:{blastRadius:120,clusterCount:3},multiply:{damage:2,cooldown:1.25}}],'heavy');
branch('laser','wide',tr('Wide beam'),[57,72],[{set:{beamWidth:20}},{set:{beamWidth:30}}]);
branch('laser','lasting',tr('Sustained beam'),[66,84],[{set:{beamDuration:.6},multiply:{damage:1.6}},{set:{beamDuration:.9},multiply:{damage:2.2}}]);
branch('laser','burnthrough',tr('Burn through'),[138],[{set:{beamDuration:1.2},multiply:{damage:3}}],'lasting');
branch('laser','split',tr('Split beams'),[156],[{set:{beamDuration:.9,beamCount:2},multiply:{damage:1.6}}],'lasting');
branch('rail','heavy',tr('Heavy acceleration'),[96,120],[{set:{knockback:180},multiply:{damage:1.4}},{set:{knockback:220},multiply:{damage:1.8,cooldown:1.2}}]);
branch('rail','magazine',tr('Magazine'),[105,135],[{set:{burstCount:2,burstInterval:.2},multiply:{damage:.8,cooldown:1.25}},{set:{burstCount:3,burstInterval:.2},multiply:{damage:.8,cooldown:1.6}}]);
branch('arc','chain',tr('Long chain'),[63,81],[{set:{chains:6}},{set:{chains:8}}]);
branch('arc','fork',tr('Forked lightning'),[135],[{set:{chains:11,forkChain:true}}],'chain');
branch('arc','surge',tr('Power discharge'),[69,87],[{set:{chains:2},multiply:{damage:1.6}},{set:{chains:2},multiply:{damage:2}}]);
branch('arc','return',tr('Return discharge'),[150],[{set:{chains:2,returnHit:true},multiply:{damage:2}}],'surge');
branch('cryo','hail',tr('Ice volley'),[48,63],[{set:{shots:3},multiply:{damage:.7}},{set:{shots:5},multiply:{damage:.6}}]);
branch('cryo','deep',tr('Deep cold'),[57,72],[{set:{slowFactor:.35,slowDuration:3}},{set:{slowFactor:.25,slowDuration:4}}]);
branch('cryo','freeze',tr('Freeze'),[120],[{set:{slowFactor:.25,slowDuration:4,freezeHits:4}}],'deep');
branch('flak','screen',tr('Wide intercept'),[45,60],[{set:{blastRadius:175}},{set:{blastRadius:210}}]);
branch('flak','cloud',tr('Defensive cloud'),[102],[{set:{blastRadius:210,cloudDuration:1.5}}],'screen');
branch('flak','rapid',tr('Rapid intercept'),[51,66],[{multiply:{cooldown:1/1.3}},{multiply:{cooldown:1/1.6}}]);
branch('pulse','push',tr('Repulsion wave'),[54,69],[{set:{knockback:40}},{set:{knockback:65}}]);
branch('pulse','double',tr('Double wave'),[120],[{set:{knockback:65,burstCount:2,burstInterval:.25,secondWave:true}}],'push');
branch('pulse','rapid',tr('Rapid pulses'),[60,75],[{multiply:{cooldown:1/1.3}},{multiply:{cooldown:1/1.6}}]);
branch('mine','field',tr('Minefield'),[45,57],[{set:{shots:2},multiply:{damage:.7}},{set:{shots:3},multiply:{damage:.6}}]);
branch('mine','chain',tr('Chain detonation'),[96],[{set:{shots:3,chainMine:true},multiply:{damage:.6}}],'field');
branch('mine','heavy',tr('Heavy mine'),[51,66],[{set:{blastRadius:110},multiply:{damage:1.6,cooldown:1.25}},{set:{blastRadius:130},multiply:{damage:2.1,cooldown:1.25}}]);
branch('mine','fragments',tr('Fragmentation'),[108],[{set:{blastRadius:130,mineFragments:true},multiply:{damage:2.1,cooldown:1.25}}],'heavy');
branch('ember','searing',tr('Persistent burn'),[51,66],[{set:{burnDuration:3.5},multiply:{burnDamage:1.5}},{set:{burnDuration:4.5},multiply:{burnDamage:1.8}}]);
branch('ember','spread',tr('Spreading fire'),[108],[{set:{burnDuration:4.5,spreadBurn:true},multiply:{burnDamage:1.8}}],'searing');
branch('ember','focused',tr('Compressed flame'),[57,72],[{set:{range:230,coneAngle:.45},multiply:{damage:1.5}},{set:{range:270,coneAngle:.35},multiply:{damage:1.8}}]);
branch('ember','trail',tr('Fire trail'),[120],[{set:{range:270,coneAngle:.35,fireTrail:true},multiply:{damage:1.8}}],'focused');
branch('gravity','well',tr('Deep vortex'),[69,87],[{set:{fieldRadius:140,fieldDuration:3}},{set:{fieldRadius:165,fieldDuration:3.5}}]);
branch('gravity','collapse',tr('Collapse'),[144],[{set:{fieldRadius:165,fieldDuration:3.5,collapseDamage:50}}],'well');
branch('gravity','crush',tr('Compressed field'),[75,96],[{set:{fieldRadius:90},multiply:{damage:1.6,pullStrength:1.3}},{set:{fieldRadius:90},multiply:{damage:2.2,pullStrength:1.6}}]);
branch('shield','wide',tr('Expanded field'),[60,78],[{set:{shieldRadius:2.8}},{set:{shieldRadius:3.2}}]);
branch('shield','reserve',tr('Reserve circuit'),[132],[{set:{shieldRadius:3.2,reserveCapacity:40}}],'wide');
branch('shield','rapid',tr('Fast recharge'),[66,84],[{set:{rechargeDelay:4}},{set:{rechargeDelay:4,rechargeRate:6}}]);
branch('repair','wide',tr('Expanded repair'),[51,66],[{set:{repairRadius:2}},{set:{repairRadius:2.5}}]);
branch('repair','emergency',tr('Emergency repair'),[57,72],[{set:{repairDelay:1.25}},{set:{repairDelay:1.25,emergencyRepair:6}}]);
function branchFor(type,id){return trees[type]&&trees[type].branches.find(function(b){return b.id===id;});}
function sequence(type,state){
 var tree=Object.prototype.hasOwnProperty.call(trees,type)?trees[type]:null;if(!tree)return null;if(!state)return [];
 if(!Number.isInteger(state.level)||state.level<0||state.level>5)return null;
 var path=Array.isArray(state.path)?state.path:[];
 var list=tree.base.map(function(s,i){return {id:'base'+(i+1),step:s};});
 var parent=null;
 for(var i=0;i<path.length;i++){
  var b=branchFor(type,path[i]);if(!b||b.parent!==parent)return null;
  b.steps.forEach(function(s,j){list.push({id:b.id,step:s,branch:b,stage:j});});parent=b.id;
 }
 if(state.level>list.length||path.length>2)return null;
 // A branch cannot be selected before its first paid stage.
 if(path.length && state.level<=tree.base.length+(path.length-1)*2)return null;
 return list.slice(0,state.level);
}
function investment(type,state){var list=sequence(type,state);return list?list.reduce(function(sum,s){return sum+s.step.cost;},0):0;}
var statLabels = {damage:tr('Damage'),cooldown:tr('Reload time'),range:tr('Range'),shots:tr('Shots per volley'),penetration:tr('Targets per shot'),pellets:tr('Pellets'),spread:tr('Spread (radians)'),volleySpread:tr('Fan spacing (radians)'),beamWidth:tr('Beam width'),beamDuration:tr('Beam duration (s)'),beamCount:tr('Beams'),chains:tr('Chain targets'),slowFactor:tr('Enemy speed fraction'),slowDuration:tr('Slow duration (s)'),blastRadius:tr('Blast radius'),knockback:tr('Knockback distance'),burnDuration:tr('Burn duration (s)'),burnDamage:tr('Burn DPS'),coneAngle:tr('Flame half-angle (radians)'),fieldRadius:tr('Field radius'),fieldDuration:tr('Field duration (s)'),pullStrength:tr('Pull strength'),collapseDamage:tr('Collapse damage'),shield:tr('Shield capacity'),shieldRadius:tr('Shield radius (cells)'),rechargeRate:tr('Shield recharge per second'),rechargeDelay:tr('Recharge delay (s)'),repairRadius:tr('Repair radius (cells)'),repairAmount:tr('HP repaired per cycle'),repairInterval:tr('Repair interval (s)'),repairDelay:tr('Safe time before repair (s)'),emergencyRepair:tr('Extra HP to most damaged tile'),hp:tr('Hull HP'),cooldownBonus:tr('Local fire rate bonus'),matterBonus:tr('First Siphon income bonus'),burstCount:tr('Attacks per cycle'),burstInterval:tr('Time between attacks (s)'),reserveCapacity:tr('Emergency shield for 2s (30s cooldown)'),cloudDuration:tr('Intercept cloud duration (s)'),clusterCount:tr('Extra blasts at 25% damage'),freezeHits:tr('Hits in 4s to freeze for 0.6s')};
// Change rows drop the radians unit because describeChange shows those values in degrees.
var shortLabels = {spread:tr('Spread'),volleySpread:tr('Fan spacing'),coneAngle:tr('Flame half-angle')};
var effects = {distributeTargets:tr('Missiles prefer different targets'),forkChain:tr('Two chains after the first target; no repeated targets'),returnHit:tr('One full-damage return hit to the first surviving target'),secondWave:tr('Second wave: 70% damage and 50% knockback'),chainMine:tr('Detonates this emitter’s other mines within 120'),mineFragments:tr('Eight fragments at 20% mine damage'),spreadBurn:tr('On death, spreads half-strength burn once within 80'),fireTrail:tr('Leaves a 2s fire area at 50% direct damage per second')};
function describe(s){
 return Object.keys(s.set).filter(function(key){return key!=='secondHitScale';}).map(function(key){
  if(effects[key])return effects[key];
  if(key==='spread'||key==='volleySpread'||key==='coneAngle')return tr('Spread: {value}°',{value:Math.round(s.set[key]*180/Math.PI)});
  if(key==='cooldownBonus'||key==='matterBonus')return tr('{label}: +{value}%',{label:statLabels[key],value:Math.round(s.set[key]*100)});
  return tr('{label}: {value}',{label:statLabels[key]||key,value:s.set[key]});
 }).concat(Object.keys(s.multiply).map(function(key){return tr('{label} ×{value}',{label:statLabels[key]||key,value:Number(s.multiply[key].toFixed(3))});})).join(' · ');
}
function options(type,state,copies,licenses){
 var tree=Object.prototype.hasOwnProperty.call(trees,type)?trees[type]:null,list=sequence(type,state);if(!tree||!list||!Number.isInteger(copies)||copies<1||copies>420)return [];
 var rank=list.length,path=state&&state.path||[],last=path.length?branchFor(type,path[path.length-1]):null;
 var candidates=[];
 if(rank<tree.base.length)candidates=[{id:'base'+(rank+1),step:tree.base[rank]}];
 else if(last&&rank===tree.base.length+1)candidates=[{id:last.id,step:last.steps[1],branch:last}];
 else {var parent=last?last.id:null;candidates=tree.branches.filter(function(b){return b.parent===parent;}).map(function(b){return {id:b.id,step:b.steps[0],branch:b,newBranch:true};});}
 return candidates.map(function(c){var licensed=!c.branch||Array.isArray(licenses)&&licenses.indexOf(type+':'+c.branch.id)>=0;return {id:c.id,name:c.step.name,description:describe(c.step),cost:c.step.cost*copies,unitCost:c.step.cost,rank:rank,locked:!licensed,license:c.branch?type+':'+c.branch.id:null,newBranch:!!c.newBranch};});
}
function nextState(type,state,choice){var path=state&&Array.isArray(state.path)?state.path.slice():[];if(choice.newBranch)path.push(choice.id);return {level:choice.rank+1,path:path,branch:path[path.length-1]||null};}
function purchase(upgrades,type,id,matter,copies,expectedRank,licenses){
 if(!upgrades||typeof upgrades!=='object'||!Object.prototype.hasOwnProperty.call(trees,type)||!Number.isFinite(matter)||matter<0)return null;
 var property=Object.getOwnPropertyDescriptor(upgrades,type);if(property?!property.writable:(!Object.isExtensible(upgrades)||type in upgrades))return null;
 var state=property?property.value:null;
 var option=options(type,state,copies,licenses).find(function(o){return o.id===id;});
 if(!option||option.locked||option.cost>matter||(expectedRank!==undefined&&option.rank!==expectedRank))return null;
 upgrades[type]=nextState(type,state,option);return {matter:matter-option.cost,option:option};
}
function apply(def,s){Object.keys(s.set).forEach(function(k){def[k]=s.set[k];});Object.keys(s.multiply).forEach(function(k){if(Number.isFinite(def[k]))def[k]*=s.multiply[k];});}
function resolve(base,state){
 var def=Object.assign({},base),list=sequence(base.id,state);if(!list)return def;
 var branchStage=null;
 list.forEach(function(item){if(item.branch)branchStage=item.step;else apply(def,item.step);});
 if(branchStage)apply(def,branchStage);return def;
}
function describeChange(base, state, choice) {
 var before=resolve(base,state),after=resolve(base,nextState(base.id,state,choice));
 function value(key,n) {
  if(key==='spread'||key==='volleySpread'||key==='coneAngle')return Number((n*180/Math.PI).toFixed(2))+'°';
  if(key==='cooldownBonus'||key==='matterBonus'||key==='slowFactor')return Number((n*100).toFixed(2))+'%';
  return String(Number(n.toFixed(4)));
 }
 return Object.keys(after).filter(function(k){return before[k]!==after[k]&&(statLabels[k]||effects[k]);}).map(function(k){
  if(effects[k])return after[k]?effects[k]:tr('Removed: {effect}',{effect:effects[k]});
  var changeLabel=shortLabels[k]||statLabels[k],afterValue=Number.isFinite(after[k])?value(k,after[k]):after[k];
  return Number.isFinite(before[k])?tr('{label}: {before} → {after}',{label:changeLabel,before:value(k,before[k]),after:afterValue}):tr('{label}: {after}',{label:changeLabel,after:afterValue});
 }).join(' · ');
}
function label(type,state){var list=sequence(type,state);if(!list)return tr('Upgrade unavailable');var last=list[list.length-1];return last?last.step.name:tr('Base');}
return {describeChange:describeChange,describeStep:describe,MAX_RANK:5,MAX_LEVEL:6,trees:trees,options:options,purchase:purchase,resolve:resolve,label:label,investment:investment,nextState:nextState};
});
