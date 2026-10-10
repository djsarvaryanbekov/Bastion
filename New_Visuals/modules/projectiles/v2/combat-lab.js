(function () {
  'use strict';
  var bridge=window.__attackVfxBridge, vfx=window.DriftAttackVfx, api=window.DriftPCGame;
  var currentWeapon=null, selected='scatter', events=[], refillClock=0;
  var names={cannon:'Auto Cannon',scatter:'Scatter Array',missile:'Missile Pod',cryo:'Cryo Projector',ember:'Ember Projector',gravity:'Gravity Well',pulse:'Pulse Nova',flak:'Flak Battery'};
  var descriptions={
    cannon:'Hot tracer · muzzle flash · hit sparks', scatter:'Five small pellets per shot · short spread',
    missile:'Homing flight · engine flicker · curved exhaust trail · blast',
    cryo:'Frost comet · impact · enemies visibly slow', ember:'Moving flame packets · cone · enemies keep burning',
    gravity:'Inward-moving energy · enemies pulled into the field', pulse:'Expanding wave around the emitter · radial hits',
    flak:'Brief airburst · incoming enemy shots are destroyed'
  };
  var proto=bridge.Game.prototype;
  function scoped(type,fn,owner,args) { var previous=currentWeapon;currentWeapon=type;try{return fn.apply(owner,args);}finally{currentWeapon=previous;} }
  var originalEffect=proto.spawnEffect;
  proto.spawnEffect=function(){
    var effect=originalEffect.apply(this,arguments);
    var tag=currentWeapon;
    if(tag && effect.type==='ring' && effect.color!==bridge.modules[tag].color)tag=null;
    vfx.tagEffect(effect,tag);return effect;
  };
  var originalProjectile=proto.spawnProjectile;
  proto.spawnProjectile=function(){var projectile=originalProjectile.apply(this,arguments);if(projectile)vfx.resetProjectile(projectile);return projectile;};
  var originalFire=proto.fireAttack;
  proto.fireAttack=function(tile,origin,nx,ny){
    var before=this.projectiles.length, result=scoped(tile.type,originalFire,this,arguments);
    vfx.shoot(tile.type,origin,nx,ny);
    events.push({type:tile.type,time:this.elapsed,shots:this.projectiles.length-before});
    if(events.length>120)events.shift();
    return result;
  };
  var originalBlast=proto.explodeMissile;
  proto.explodeMissile=function(){return scoped('missile',originalBlast,this,arguments);};
  var originalEffects=proto.updateEffects;
  proto.updateEffects=function(dt){var result=originalEffects.apply(this,arguments);if(this===bridge.game())vfx.update(dt);return result;};
  var originalProjectiles=proto.updateProjectiles;
  proto.updateProjectiles=function(){var result=originalProjectiles.apply(this,arguments);vfx.sampleProjectiles(this);return result;};

  function configureTargets(game,type) {
    if(type==='flak') { game.enemies.forEach(function(enemy){enemy.fireClock=.1;}); return; }
    game.enemies.length=0;game.enemyById.clear();game.enemyGrid.clear();
    var origin=game.gridToWorld(0,-1);
    var moving=['cryo','gravity','missile'].indexOf(type)>=0;
    var points=type==='pulse'?Array.from({length:7},function(_,i){var a=i*Math.PI*2/7;return [Math.cos(a)*170,Math.sin(a)*170];}):
      type==='scatter'?[[-28,-195],[28,-195],[-67,-230],[67,-230]]:
      type==='ember'?[[-44,-105],[12,-135],[65,-143]]:
      type==='gravity'?[[-52,-190],[8,-235],[60,-200],[-55,-270],[55,-270]]:
      type==='missile'?[[-70,-315],[70,-340]]:[[-55,-290],[55,-310],[0,-360]];
    points.forEach(function(point,i){
      var enemy=game.spawnEnemy(type==='ember'?'brute':i%2?'hunter':'scout',origin.x+point[0],origin.y+point[1]);
      if(!enemy)return;
      enemy.fireClock=9999;
      if(!moving) {enemy.speed=0;enemy.rangeAnchor={x:enemy.x,y:enemy.y};}
      else enemy.speed=type==='missile'?44:30;
    });
    game.rebuildEnemyGrid();
  }
  function select(type) {
    if(!names[type])return;
    selected=type;events.length=0;refillClock=0;vfx.reset();
    if(!api.rangeState())api.startRange(type);else api.rangeModule(type);
    if(type==='flak')api.rangeScenario('incoming');
    else if(['cryo','gravity','missile'].indexOf(type)>=0)api.rangeScenario('moving');
    else api.rangeScenario('stationary');
    var game=bridge.game();
    configureTargets(game,type);
    game.ship.tiles.forEach(function(tile){tile.cooldown=.35;});
    // Only this review instance refills its demonstration targets. Game methods remain intact.
    var update=game.update;
    game.update=function(dt){
      if(selected==='missile')this.enemies.forEach(function(enemy,index){if(!enemy.dead)enemy.x+=Math.sin(game.elapsed*1.2+index)*60*dt;});
      update.call(this,dt);
      if(!this.enemies.some(function(enemy){return !enemy.dead;}))refillClock+=dt;else refillClock=0;
      if(refillClock>.7){configureTargets(this,selected);refillClock=0;}
    };
    document.getElementById('attack-lab-note').textContent=descriptions[type];
    document.querySelectorAll('[data-attack]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.attack===type));});
    document.getElementById('attack-lab-pause').textContent='Pause';
  }
  function boot() {
    var style=document.createElement('style');
    style.textContent='#hud,#controlHint,#pcRangePanel,#debugBar,#mobileControls{display:none!important}.attack-lab-toolbar{position:fixed;z-index:1000;top:18px;left:24px;right:24px;display:flex;gap:8px;align-items:center;padding:10px;background:#0b1c27ed;border:1px solid #304958;border-radius:5px}.attack-lab-toolbar button{padding:10px 12px;font:13px system-ui;color:#bcd1db;background:#142b38;border:1px solid #314b5a;border-radius:3px;cursor:pointer}.attack-lab-toolbar button[aria-pressed=true]{color:#ecfdff;border-color:#8bd7df;background:#254753}.attack-lab-toolbar .lab-spacer{flex:1}#attack-lab-note{position:fixed;bottom:28px;left:32px;z-index:1000;color:#a9c4cf;font:14px system-ui;pointer-events:none}.attack-lab-title{font:14px system-ui;color:#e9f9ff;margin:0 8px}';
    document.head.append(style);
    var toolbar=document.createElement('nav');toolbar.className='attack-lab-toolbar';toolbar.setAttribute('aria-label','Attack effect preview');
    var title=document.createElement('span');title.className='attack-lab-title';title.textContent='Effects v2';toolbar.append(title);
    Object.keys(names).forEach(function(type){var button=document.createElement('button');button.dataset.attack=type;button.textContent=names[type];button.onclick=function(){select(type);};toolbar.append(button);});
    var spacer=document.createElement('span');spacer.className='lab-spacer';toolbar.append(spacer);
    var toggle=document.createElement('button');toggle.id='attack-lab-toggle';toggle.textContent='Showing revised';toggle.onclick=function(){vfx.setEnabled(!vfx.enabled);toggle.textContent=vfx.enabled?'Showing revised':'Showing original';};toolbar.append(toggle);
    var pause=document.createElement('button');pause.id='attack-lab-pause';pause.textContent='Pause';pause.onclick=function(){var game=bridge.game();game.state=game.state==='playing'?'paused':'playing';pause.textContent=game.state==='playing'?'Pause':'Resume';};toolbar.append(pause);
    var note=document.createElement('p');note.id='attack-lab-note';document.body.append(toolbar,note);
    bridge.save.settings.muted=true;bridge.save.settings.autoPause=false;
    select('scatter');
    window.AttackVfxLab={select:select,game:bridge.game,render:bridge.render,events:events,ready:true,descriptions:descriptions};
  }
  function ready(){Promise.all([vfx.ready,window.DriftModuleArt.ready,window.DriftEnemyArt.ready]).then(boot).catch(function(error){console.error('Attack preview failed',error);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
