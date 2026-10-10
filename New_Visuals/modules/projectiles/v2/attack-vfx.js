(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var sheets = Object.create(null), effectTags = new WeakMap(), trails = new WeakMap();
  var muzzles = [], enabled = true;
  var ready = Promise.all(root.ATTACK_VFX_SHEETS.map(function (sheet) {
    var image = new Image();
    image.src = sheet.data;
    sheets[sheet.module] = { spec: sheet, image: image };
    return image.decode();
  }));

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function stamp(ctx, type, frame, x, y, width, height, angle) {
    var entry = sheets[type];
    if (!entry || !entry.image.complete || !entry.image.naturalWidth) return;
    var spec = entry.spec, cell = entry.image.naturalWidth / spec.frames;
    frame = Math.max(0, Math.min(spec.frames - 1, Math.floor(frame)));
    ctx.save(); ctx.translate(x, y); ctx.rotate((angle || 0) + Math.PI / 2);
    ctx.drawImage(entry.image, frame * cell, 0, cell, entry.image.naturalHeight,
      -spec.anchor[0] / spec.width * width, -spec.anchor[1] / spec.height * height, width, height);
    ctx.restore();
  }
  function radialStamp(ctx, type, frame, x, y, size) {
    stamp(ctx, type, frame, x, y, size, size, -Math.PI / 2);
  }
  function shoot(type, origin, nx, ny) {
    if (['cannon','scatter','missile','cryo'].indexOf(type) < 0) return;
    if (muzzles.length >= 64) muzzles.shift();
    muzzles.push({ type:type, x:origin.x+nx*20, y:origin.y+ny*20, angle:Math.atan2(ny,nx), life:.09, maxLife:.09 });
  }
  function update(dt) {
    var write=0;
    for(var i=0;i<muzzles.length;i++) { var muzzle=muzzles[i]; muzzle.life-=dt; if(muzzle.life>0) muzzles[write++]=muzzle; }
    muzzles.length=write;
  }
  function sampleProjectiles(game) {
    for(var i=0;i<game.projectiles.length;i++) {
      var p=game.projectiles[i];
      if(p.kind!=='missile' || p.life<=0) continue;
      var trail=trails.get(p);
      if(!trail) { trail={x:new Float32Array(10),y:new Float32Array(10),count:0,head:0}; trails.set(p,trail); }
      trail.x[trail.head]=p.x; trail.y[trail.head]=p.y;
      trail.head=(trail.head+1)%10; trail.count=Math.min(10,trail.count+1);
    }
  }
  function drawProjectile(ctx,p,pos,time,quality,reducedFlash) {
    if(!enabled || !sheets[p.kind] || ['cannon','scatter','missile','cryo'].indexOf(p.kind)<0) return false;
    var angle=Math.atan2(p.vy,p.vx), frame=Math.floor(time*24)%sheets[p.kind].spec.frames;
    ctx.save(); ctx.shadowBlur=0; ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=reducedFlash?.78:1;
    if(p.kind==='missile') {
      var trail=trails.get(p);
      if(trail && trail.count>1) {
        var limit=quality>0?5:10;
        for(var i=1;i<Math.min(limit,trail.count);i++) {
          var index=(trail.head-1-i+10)%10, freshness=1-i/10;
          ctx.globalAlpha=freshness*.22;
          var next=(index+1)%10;
          ctx.strokeStyle='#b1a69b';ctx.lineWidth=2+(1-freshness)*3;ctx.lineCap='round';ctx.beginPath();
          ctx.moveTo(pos.x+trail.x[index]-p.x,pos.y+trail.y[index]-p.y);
          ctx.lineTo(pos.x+trail.x[next]-p.x,pos.y+trail.y[next]-p.y);ctx.stroke();
        }
      }
      ctx.globalAlpha=reducedFlash?.78:1;
      stamp(ctx,'missile',frame,pos.x,pos.y,18,27,angle);
    } else if(p.kind==='cryo') stamp(ctx,'cryo',frame,pos.x,pos.y,23,23,angle);
    else if(p.kind==='scatter') stamp(ctx,'scatter',frame,pos.x,pos.y,12,12,angle);
    else stamp(ctx,'cannon',frame,pos.x,pos.y,18,18,angle);
    ctx.restore(); return true;
  }
  function drawEffect(ctx,e,pos,reducedFlash) {
    if(!enabled) return false;
    var type=effectTags.get(e), alpha=clamp(e.life/e.maxLife), age=1-alpha;
    if(e.type==='flameCone') type='ember';
    if(e.type!=='flameCone' && e.type!=='ring') return false;
    if(['ember','pulse','flak','missile'].indexOf(type)<0) return false;
    ctx.save(); ctx.shadowBlur=0; ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=alpha*(reducedFlash?.65:1);
    if(type==='ember') {
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=clamp(e.life/(e.maxLife*.35))*(reducedFlash?.6:1);
      // Clip the moving texture to the game's actual cone angle and radius.
      ctx.beginPath(); ctx.moveTo(pos.x,pos.y);
      ctx.arc(pos.x,pos.y,e.radius,e.angle-e.width,e.angle+e.width); ctx.closePath(); ctx.clip();
      var reach=e.radius*(.5+.5*Math.min(1,age*5));
      stamp(ctx,'ember',Math.min(7,Math.floor(age*8)),pos.x,pos.y,reach*2*Math.sin(e.width),reach*128/116,e.angle);
    } else if(type==='pulse') {
      var radius=Math.max(5,e.radius), scale=radius*256/104;
      radialStamp(ctx,'pulse',age*6,pos.x,pos.y,scale);
      ctx.globalAlpha=alpha*.22;
      radialStamp(ctx,'pulse',age*6,pos.x,pos.y,scale*.88);
    } else if(type==='flak') {
      radialStamp(ctx,'flak',age*8,pos.x,pos.y,Math.min(150,e.maxRadius*1.2));
    } else {
      var blastRadius=Math.max(5,e.radius);
      radialStamp(ctx,'flak',age*8,pos.x,pos.y,Math.min(e.maxRadius*2,blastRadius*2.3));
    }
    ctx.restore(); return true;
  }
  function drawField(ctx,field,pos,reducedFlash,quality) {
    if(!enabled) return false;
    var age=field.maxLife-field.life, fade=clamp(age/.13)*clamp(field.life/.25);
    ctx.save(); ctx.shadowBlur=0; ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle='#c8a2ff'; ctx.lineWidth=1.2; ctx.globalAlpha=fade*.35;
    ctx.beginPath(); ctx.arc(pos.x,pos.y,field.radius,0,TAU); ctx.stroke();
    var count=quality>0?8:14;
    for(var i=0;i<count;i++) {
      var progress=(age*.85+i/count)%1, radius=field.radius*(1-progress);
      var angle=i*2.39996+progress*.9;
      var x=pos.x+Math.cos(angle)*radius, y=pos.y+Math.sin(angle)*radius;
      ctx.globalAlpha=fade*Math.sin(progress*Math.PI)*(reducedFlash?.5:.9);
      stamp(ctx,'gravity',Math.floor(age*16+i)%4,x,y,24,36,angle+Math.PI+.35);
    }
    ctx.globalAlpha=fade*.8; ctx.fillStyle='#111e2d';
    ctx.beginPath(); ctx.arc(pos.x,pos.y,5,0,TAU); ctx.fill();
    ctx.strokeStyle='#d4bdff'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.arc(pos.x,pos.y,6+Math.sin(age*10)*.6,age*2,age*2+Math.PI*1.6); ctx.stroke();
    ctx.restore(); return true;
  }
  function drawMuzzles(ctx,screen,reducedFlash) {
    if(!enabled) return;
    ctx.save(); ctx.shadowBlur=0; ctx.globalCompositeOperation='source-over';
    for(var i=0;i<muzzles.length;i++) {
      var m=muzzles[i], pos=screen(m.x,m.y), alpha=m.life/m.maxLife;
      ctx.save(); ctx.translate(pos.x,pos.y); ctx.rotate(m.angle);
      ctx.globalAlpha=alpha*(reducedFlash?.5:.9);
      ctx.fillStyle=m.type==='cryo'?'#d8f6ff':m.type==='cannon'?'#d4faff':'#ffe1b3';
      ctx.beginPath(); ctx.ellipse(2,0,m.type==='scatter'?11:7,m.type==='scatter'?5:2.7,0,0,TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  root.DriftAttackVfx={
    ready:ready, projectile:drawProjectile, effect:drawEffect, field:drawField, muzzles:drawMuzzles,
    shoot:shoot, update:update, sampleProjectiles:sampleProjectiles,
    tagEffect:function(e,type){effectTags.delete(e);if(type)effectTags.set(e,type);},
    resetProjectile:function(p){trails.delete(p);},
    reset:function(){muzzles.length=0;trails=new WeakMap();effectTags=new WeakMap();},
    setEnabled:function(value){enabled=Boolean(value);},
    get enabled(){return enabled;},
    stats:function(){return {muzzles:muzzles.length};}
  };
})(window);
