"use strict";
const fs = require("node:fs"), path = require("node:path");
const input = path.resolve(process.argv[2] || "outputs/Drift_Bastion_Playtest.html");
const output = path.resolve(process.argv[3] || "outputs/handling-qa/review.html");
let html = fs.readFileSync(input, "utf8");
const marker = "    window.__driftBastion = {";
if (html.split(marker).length !== 2) throw Error("Expected one runtime marker");
html = html.replace(marker, `
    (function () {
      var timer = 0, frame = 0, profiles = [], results = null;
      var panel = document.createElement("section");
      panel.style.cssText = "position:fixed;inset:24px;z-index:10000;background:#101b28;border:1px solid #647e91;border-radius:12px;padding:20px;color:#edf5ff;font:16px system-ui;overflow:auto";
      panel.innerHTML = '<div style="display:flex;gap:12px;align-items:center"><strong>Ship handling — equal mass, different layouts</strong><button id="handlingReset">Reset comparison</button><button id="handlingRun">Run comparison</button><button id="handlingChecks">Run checks</button><button id="handlingRecord">Record comparison</button></div><p>Same turn input. Weight farther from the Core slows the turn and its response.</p><canvas id="handlingCanvas" width="1680" height="640" style="display:block;max-width:100%;height:auto"></canvas><output id="handlingState" role="status" style="display:block;white-space:pre-wrap;font:12px monospace;height:130px;overflow:auto"></output>';
      document.body.appendChild(panel);
      var detail = document.getElementById("handlingCanvas"), dc = detail.getContext("2d"), state = document.getElementById("handlingState");
      function resetInputs() { Object.keys(keys).forEach(function(k){delete keys[k];});mouseInput.active=false;mobileInput.active=false; }
      function shape(kind) {
        var g = new Game({training:true});g.ship.tiles.clear();g.state="paused";g.emitDriveParticles=function(){};
        function add(x,y){g.ship.tiles.set(keyOf(x,y),makeTile(x||y?"bulkhead":"core",x,y,!x&&!y,1,true));}
        if(kind===0)for(var x=-1;x<=1;x++)for(var y=-1;y<=1;y++)add(x,y);
        else if(kind===1)for(var x=-4;x<=4;x++)add(x,0);
        else for(var x=0;x<=8;x++)add(x,0);
        g.updateMovement(0);return g;
      }
      function report() {
        state.textContent=JSON.stringify({build:playtestTelemetry.getDataForTests().gameBuild,viewport:[innerWidth,innerHeight],frame:frame,profiles:profiles.map(function(g,i){return {layout:["compact","wide","off-center"][i],mass:g.handling.mass,turnMultiplier:g.handling.turnMultiplier,responseMultiplier:g.handling.responseMultiplier,angle:g.ship.angle,angularVelocity:g.ship.angularVelocity};}),checks:results});
      }
      function draw() {
        dc.fillStyle="#101b28";dc.fillRect(0,0,1680,640);
        dc.textAlign="center";dc.font="bold 23px system-ui";
        var active=game,previous=ctx;
        profiles.forEach(function(g,i){
          var cx=280+i*560,cy=325;
          dc.fillStyle=["#65e8ff","#ffbd6a","#bd9aff"][i];dc.fillText(["COMPACT","WIDE","OFF-CENTER"][i],cx,42);
          dc.font="16px system-ui";dc.fillStyle="#acbecd";dc.fillText("Mass "+g.handling.mass.toFixed(1)+" · Turn "+Math.round(g.handling.turnMultiplier*100)+"%",cx,73);
          dc.strokeStyle="#354d61";dc.lineWidth=1;dc.beginPath();dc.arc(cx,cy,235,0,TAU);dc.stroke();
          dc.beginPath();dc.moveTo(cx,cy-235);dc.lineTo(cx,cy+235);dc.moveTo(cx-235,cy);dc.lineTo(cx+235,cy);dc.stroke();
          dc.save();dc.translate(cx-viewWidth/2,cy-viewHeight/2);dc.scale(.85,.85);dc.translate(viewWidth/2*(1/.85-1),viewHeight/2*(1/.85-1));
          game=g;ctx=dc;g.camera.x=0;g.camera.y=0;g.camera.zoom=1;
          dc.translate(0,-Math.min(90,viewHeight*.14));
          try{drawShip();}finally{game=active;ctx=previous;dc.restore();}
          dc.fillStyle="#edf5ff";dc.font="18px system-ui";dc.fillText((g.ship.angle*180/Math.PI).toFixed(1)+"° · "+g.ship.angularVelocity.toFixed(2)+" rad/s",cx,598);
          dc.font="bold 23px system-ui";
        });
        dc.font="17px system-ui";dc.fillStyle="#acbecd";dc.fillText(frame<18?"TURN RIGHT":frame<42?"RELEASE":frame<60?"TURN LEFT":"RELEASE",840,635);report();
      }
      function reset() {clearInterval(timer);resetInputs();frame=0;results=null;profiles=[shape(0),shape(1),shape(2)];draw();}
      function step() {
        resetInputs();if(frame<18)keys.KeyD=true;else if(frame>=42&&frame<60)keys.KeyA=true;
        profiles.forEach(function(g){g.updateMovement(1/30);});resetInputs();frame++;draw();
      }
      function run(done) {reset();timer=setInterval(function(){step();if(frame>=84){clearInterval(timer);if(done)done();}},1000/30);}
      function checks() {
        reset();var checks=[],saved=JSON.stringify(save),modes=["keyboard","mouse","touch"];
        modes.forEach(function(mode){
          var angles=[];
          for(var kind=0;kind<3;kind++){
            var g=shape(kind);
            for(var f=0;f<6;f++){
              resetInputs();if(mode==="keyboard")keys.KeyD=true;
              if(mode==="mouse"){mouseInput.active=true;mouseInput.x=viewWidth/2+(g.ship.x-g.camera.x)*g.camera.zoom+200;mouseInput.y=viewHeight/2+(g.ship.y-g.camera.y)*g.camera.zoom;}
              if(mode==="touch"){mobileInput.active=true;mobileInput.x=1;mobileInput.y=0;mobileInput.magnitude=1;}
              g.updateMovement(1/30);
            }
            angles.push(g.ship.angle);
          }
          checks.push({mode:mode,angles:angles,wideSlower:angles[1]<angles[0]*.8});
        });
        resetInputs();results={passed:checks.every(function(c){return c.wideSlower;})&&saved===JSON.stringify(save),steering:checks,saveUnchanged:saved===JSON.stringify(save)};draw();
      }
      document.getElementById("handlingReset").onclick=reset;document.getElementById("handlingRun").onclick=function(){run();};document.getElementById("handlingChecks").onclick=checks;
      document.getElementById("handlingRecord").onclick=function(){
        reset();var stream=detail.captureStream(30),recorder=new MediaRecorder(stream),chunks=[];
        recorder.ondataavailable=function(e){if(e.data.size)chunks.push(e.data);};
        recorder.onstop=function(){stream.getTracks().forEach(function(t){t.stop();});var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));a.download="Drift_Bastion_Shape_Handling.webm";a.textContent="Download handling comparison";a.style.cssText="color:#65e8ff;display:block";panel.appendChild(a);};
        recorder.start();run(function(){recorder.stop();});
      };
      reset();
    })();
` + marker);
const storage = '<script>(function(){const values=new Map();Object.defineProperty(window,"localStorage",{value:{getItem(k){return values.has(String(k))?values.get(String(k)):null;},setItem(k,v){values.set(String(k),String(v));},removeItem(k){values.delete(String(k));},clear(){values.clear();},key(i){return Array.from(values.keys())[i]||null;},get length(){return values.size;}},configurable:true});localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,fragments:57,settings:{muted:true},training:{completed:true}}));})();</script>';
html = html.replace("<head>", "<head>\n" + storage);
fs.mkdirSync(path.dirname(output), {recursive:true});fs.writeFileSync(output,html);console.log(output);
