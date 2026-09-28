(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DriftRunUpgrades=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
// Each branch stage replaces its predecessor relative to the fully upgraded base.
var trees={};
function step(name,cost,set,multiply){return {name:name,cost:cost,set:set||{},multiply:multiply||{}};}
function family(type,prices,special){
 var defaults=[step('Damage +15%',prices[0],{},type==='ember'?{damage:1.15,burnDamage:1.15}:{damage:1.15}),step('Fire rate +15%',prices[1],{},{cooldown:1/1.15})];
 trees[type]={base:special||defaults,branches:[]};
}
function branch(type,id,name,prices,changes,parent){
 trees[type].branches.push({id:id,name:name,parent:parent||null,fragmentCost:parent?80:64,steps:prices.map(function(cost,i){return step(name+' '+(i+1),cost,changes[i].set,changes[i].multiply);})});
}
family('cannon',[8,12]);family('scatter',[10,14]);family('missile',[16,24]);family('laser',[14,20]);family('rail',[20,30]);family('arc',[14,22]);family('pulse',[14,22]);family('mine',[10,16]);family('ember',[12,18]);
family('cryo',[12,18],[step('Slow lasts 2.5s',12,{slowDuration:2.5}),step('Fire rate +15%',18,{},{cooldown:1/1.15})]);
family('flak',[12,18],[step('Intercept radius 140',12,{blastRadius:140}),step('Fire rate +15%',18,{},{cooldown:1/1.15})]);
family('gravity',[16,24],[step('Field lasts 2.5s',16,{fieldDuration:2.5}),step('Field radius 115',24,{fieldRadius:115})]);
family('shield',[14,20],[step('Shield capacity 75',14,{shield:75}),step('Recharge 5/s',20,{rechargeRate:5})]);
family('repair',[12,18],[step('Repair 6 HP',12,{repairAmount:6}),step('Repair every 1.25s',18,{repairInterval:1.25})]);
family('reactor',[],[step('Local fire rate +30%',18,{cooldownBonus:.30}),step('Local fire rate +35%',27,{cooldownBonus:.35}),step('Local fire rate +40%',45,{cooldownBonus:.4})]);
family('armor',[],[step('150 HP',4,{hp:150}),step('180 HP',6,{hp:180}),step('220 HP',10,{hp:220})]);
family('bulkhead',[],[step('210 HP',6,{hp:210}),step('250 HP',9,{hp:250}),step('300 HP',14,{hp:300})]);
family('collector',[],[step('First Siphon +12%',12,{matterBonus:.12}),step('First Siphon +14%',20,{matterBonus:.14}),step('First Siphon +16%',32,{matterBonus:.16})]);
branch('cannon','twin','Twin volley',[24,30],[{set:{shots:2},multiply:{damage:.75}},{set:{shots:3},multiply:{damage:.65}}]);
branch('cannon','fan','Fan volley',[48],[{set:{shots:5,volleySpread:.12},multiply:{damage:.55}}],'twin');
branch('cannon','focus','Focused volley',[54],[{set:{shots:4},multiply:{damage:.7}}],'twin');
branch('cannon','pierce','Piercing shot',[28,34],[{set:{penetration:2}},{set:{penetration:3}}]);
branch('cannon','through','Through fire',[60],[{set:{penetration:5},multiply:{damage:.75}}],'pierce');
branch('cannon','impact','Impact round',[54],[{set:{penetration:2,secondHitScale:7/18},multiply:{damage:1.8,cooldown:1.15}}],'pierce');
branch('scatter','cone','Buckshot',[26,34],[{set:{pellets:9,spread:.5},multiply:{damage:.75}},{set:{pellets:11,spread:.5},multiply:{damage:.75}}]);
branch('scatter','double','Double blast',[56],[{set:{pellets:11,spread:.5,burstCount:2,burstInterval:.15},multiply:{damage:.75,cooldown:1.5}}],'cone');
branch('scatter','focus','Tight pattern',[30,38],[{set:{range:300,spread:.18}},{set:{range:340,spread:.12,pellets:7}}]);
branch('missile','salvo','Missile salvo',[48,60],[{set:{shots:2},multiply:{damage:.7}},{set:{shots:3},multiply:{damage:.6}}]);
branch('missile','distribute','Distributed targets',[96],[{set:{shots:4,distributeTargets:true},multiply:{damage:.55}}],'salvo');
branch('missile','focus','Focused barrage',[108],[{set:{shots:4},multiply:{damage:.65,cooldown:1.15}}],'salvo');
branch('missile','heavy','Heavy warhead',[52,64],[{set:{blastRadius:100},multiply:{damage:1.6}},{set:{blastRadius:120},multiply:{damage:2,cooldown:1.25}}]);
branch('missile','cluster','Cluster warhead',[120],[{set:{blastRadius:120,clusterCount:3},multiply:{damage:2,cooldown:1.25}}],'heavy');
branch('laser','wide','Wide beam',[38,48],[{set:{beamWidth:20}},{set:{beamWidth:30}}]);
branch('laser','lasting','Sustained beam',[44,56],[{set:{beamDuration:.6},multiply:{damage:1.6}},{set:{beamDuration:.9},multiply:{damage:2.2}}]);
branch('laser','burnthrough','Burn through',[92],[{set:{beamDuration:1.2},multiply:{damage:3}}],'lasting');
branch('laser','split','Split beams',[104],[{set:{beamDuration:.9,beamCount:2},multiply:{damage:1.6}}],'lasting');
branch('rail','heavy','Heavy acceleration',[64,80],[{set:{knockback:180},multiply:{damage:1.4}},{set:{knockback:220},multiply:{damage:1.8,cooldown:1.2}}]);
branch('rail','magazine','Magazine',[70,90],[{set:{burstCount:2,burstInterval:.2},multiply:{damage:.8,cooldown:1.25}},{set:{burstCount:3,burstInterval:.2},multiply:{damage:.8,cooldown:1.6}}]);
branch('arc','chain','Long chain',[42,54],[{set:{chains:6}},{set:{chains:8}}]);
branch('arc','fork','Forked lightning',[90],[{set:{chains:11,forkChain:true}}],'chain');
branch('arc','surge','Power discharge',[46,58],[{set:{chains:2},multiply:{damage:1.6}},{set:{chains:2},multiply:{damage:2}}]);
branch('arc','return','Return discharge',[100],[{set:{chains:2,returnHit:true},multiply:{damage:2}}],'surge');
branch('cryo','hail','Ice volley',[32,42],[{set:{shots:3},multiply:{damage:.7}},{set:{shots:5},multiply:{damage:.6}}]);
branch('cryo','deep','Deep cold',[38,48],[{set:{slowFactor:.35,slowDuration:3}},{set:{slowFactor:.25,slowDuration:4}}]);
branch('cryo','freeze','Freeze',[80],[{set:{slowFactor:.25,slowDuration:4,freezeHits:4}}],'deep');
branch('flak','screen','Wide intercept',[30,40],[{set:{blastRadius:175}},{set:{blastRadius:210}}]);
branch('flak','cloud','Defensive cloud',[68],[{set:{blastRadius:210,cloudDuration:1.5}}],'screen');
branch('flak','rapid','Rapid intercept',[34,44],[{multiply:{cooldown:1/1.3}},{multiply:{cooldown:1/1.6}}]);
branch('pulse','push','Repulsion wave',[36,46],[{set:{knockback:40}},{set:{knockback:65}}]);
branch('pulse','double','Double wave',[80],[{set:{knockback:65,burstCount:2,burstInterval:.25,secondWave:true}}],'push');
branch('pulse','rapid','Rapid pulses',[40,50],[{multiply:{cooldown:1/1.3}},{multiply:{cooldown:1/1.6}}]);
branch('mine','field','Minefield',[30,38],[{set:{shots:2},multiply:{damage:.7}},{set:{shots:3},multiply:{damage:.6}}]);
branch('mine','chain','Chain detonation',[64],[{set:{shots:3,chainMine:true},multiply:{damage:.6}}],'field');
branch('mine','heavy','Heavy mine',[34,44],[{set:{blastRadius:110},multiply:{damage:1.6,cooldown:1.25}},{set:{blastRadius:130},multiply:{damage:2.1,cooldown:1.25}}]);
branch('mine','fragments','Fragmentation',[72],[{set:{blastRadius:130,mineFragments:true},multiply:{damage:2.1,cooldown:1.25}}],'heavy');
branch('ember','searing','Persistent burn',[34,44],[{set:{burnDuration:3.5},multiply:{burnDamage:1.5}},{set:{burnDuration:4.5},multiply:{burnDamage:1.8}}]);
branch('ember','spread','Spreading fire',[72],[{set:{burnDuration:4.5,spreadBurn:true},multiply:{burnDamage:1.8}}],'searing');
branch('ember','focused','Compressed flame',[38,48],[{set:{range:230,coneAngle:.45},multiply:{damage:1.5}},{set:{range:270,coneAngle:.35},multiply:{damage:1.8}}]);
branch('ember','trail','Fire trail',[80],[{set:{range:270,coneAngle:.35,fireTrail:true},multiply:{damage:1.8}}],'focused');
branch('gravity','well','Deep vortex',[46,58],[{set:{fieldRadius:140,fieldDuration:3}},{set:{fieldRadius:165,fieldDuration:3.5}}]);
branch('gravity','collapse','Collapse',[96],[{set:{fieldRadius:165,fieldDuration:3.5,collapseDamage:50}}],'well');
branch('gravity','crush','Compressed field',[50,64],[{set:{fieldRadius:90},multiply:{damage:1.6,pullStrength:1.3}},{set:{fieldRadius:90},multiply:{damage:2.2,pullStrength:1.6}}]);
branch('shield','wide','Expanded field',[40,52],[{set:{shieldRadius:2.8}},{set:{shieldRadius:3.2}}]);
branch('shield','reserve','Reserve circuit',[88],[{set:{shieldRadius:3.2,reserveCapacity:40}}],'wide');
branch('shield','rapid','Fast recharge',[44,56],[{set:{rechargeDelay:4}},{set:{rechargeDelay:4,rechargeRate:8}}]);
branch('repair','wide','Expanded repair',[34,44],[{set:{repairRadius:2}},{set:{repairRadius:2.5}}]);
branch('repair','emergency','Emergency repair',[38,48],[{set:{repairDelay:1.25}},{set:{repairDelay:1.25,emergencyRepair:6}}]);
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
var statLabels = {damage:'Damage',cooldown:'Reload time',range:'Range',shots:'Shots per volley',penetration:'Targets per shot',pellets:'Pellets',spread:'Spread (radians)',volleySpread:'Fan spacing (radians)',beamWidth:'Beam width',beamDuration:'Beam duration (s)',beamCount:'Beams',chains:'Chain targets',slowFactor:'Enemy speed fraction',slowDuration:'Slow duration (s)',blastRadius:'Blast radius',knockback:'Knockback distance',burnDuration:'Burn duration (s)',burnDamage:'Burn DPS',coneAngle:'Flame half-angle (radians)',fieldRadius:'Field radius',fieldDuration:'Field duration (s)',pullStrength:'Pull strength',collapseDamage:'Collapse damage',shield:'Shield capacity',shieldRadius:'Shield radius (cells)',rechargeRate:'Shield recharge per second',rechargeDelay:'Recharge delay (s)',repairRadius:'Repair radius (cells)',repairAmount:'HP repaired per cycle',repairInterval:'Repair interval (s)',repairDelay:'Safe time before repair (s)',emergencyRepair:'Extra HP to most damaged tile',hp:'Hull HP',cooldownBonus:'Local fire rate bonus',matterBonus:'First Siphon income bonus',burstCount:'Attacks per cycle',burstInterval:'Time between attacks (s)',reserveCapacity:'Emergency shield for 2s (30s cooldown)',cloudDuration:'Intercept cloud duration (s)',clusterCount:'Extra blasts at 25% damage',freezeHits:'Hits in 4s to freeze for 0.6s'};
var effects = {distributeTargets:'Missiles prefer different targets',forkChain:'Two chains after the first target; no repeated targets',returnHit:'One full-damage return hit to the first surviving target',secondWave:'Second wave: 70% damage and 50% knockback',chainMine:'Detonates this emitter’s other mines within 120',mineFragments:'Eight fragments at 20% mine damage',spreadBurn:'On death, spreads half-strength burn once within 80',fireTrail:'Leaves a 2s fire area at 50% direct damage per second'};
function describe(s){
 return Object.keys(s.set).filter(function(key){return key!=='secondHitScale';}).map(function(key){
  if(effects[key])return effects[key];
  if(key==='spread'||key==='volleySpread'||key==='coneAngle')return 'Spread: '+Math.round(s.set[key]*180/Math.PI)+'°';
  if(key==='cooldownBonus'||key==='matterBonus')return statLabels[key]+': +'+Math.round(s.set[key]*100)+'%';
  return (statLabels[key]||key)+': '+s.set[key];
 }).concat(Object.keys(s.multiply).map(function(key){return (statLabels[key]||key)+' ×'+Number(s.multiply[key].toFixed(3));})).join(' · ');
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
  if(effects[k])return after[k]?effects[k]:'Removed: '+effects[k];
  return statLabels[k].replace(' (radians)', '')+': '+(Number.isFinite(before[k])?value(k,before[k])+' → ':'')+(Number.isFinite(after[k])?value(k,after[k]):after[k]);
 }).join(' · ');
}
function label(type,state){var list=sequence(type,state);if(!list)return 'Upgrade unavailable';var last=list[list.length-1];return last?last.step.name:'Base';}
return {describeChange:describeChange,describeStep:describe,MAX_RANK:5,MAX_LEVEL:6,trees:trees,options:options,purchase:purchase,resolve:resolve,label:label,investment:investment,nextState:nextState};
});
