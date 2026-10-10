// Editable SVG flipbooks: small energy sprites and transient bursts, not equipment icons.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const sheets = [];
const selected = process.argv[2];
const inkscape = process.env.INKSCAPE_PATH || 'C:/Program Files/Inkscape/bin/inkscape.com';
const defs = `<defs>
  <radialGradient id="cyan"><stop stop-color="#edffff"/><stop offset=".25" stop-color="#9ef4ff" stop-opacity=".65"/><stop offset="1" stop-color="#65e8ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ice"><stop stop-color="#f4fdff" stop-opacity=".9"/><stop offset=".4" stop-color="#a8e1ff" stop-opacity=".4"/><stop offset="1" stop-color="#8ac7ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="warm"><stop stop-color="#fff6d7"/><stop offset=".25" stop-color="#ffd494" stop-opacity=".8"/><stop offset="1" stop-color="#ffa86d" stop-opacity="0"/></radialGradient>
  <radialGradient id="violet"><stop stop-color="#eee1ff" stop-opacity=".8"/><stop offset=".35" stop-color="#c8a2ff" stop-opacity=".3"/><stop offset="1" stop-color="#b187ee" stop-opacity="0"/></radialGradient>
  <linearGradient id="trail" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b6f8ff" stop-opacity=".65"/><stop offset="1" stop-color="#65e8ff" stop-opacity="0"/></linearGradient>
  <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#fff0b9" stop-opacity=".8"/><stop offset=".28" stop-color="#ffb96f" stop-opacity=".65"/><stop offset=".75" stop-color="#ff8050" stop-opacity=".3"/><stop offset="1" stop-color="#e85e47" stop-opacity="0"/></linearGradient>
  <radialGradient id="fire-packet"><stop stop-color="#fff4bd" stop-opacity=".95"/><stop offset=".25" stop-color="#ffd580" stop-opacity=".85"/><stop offset=".55" stop-color="#ff8f49" stop-opacity=".65"/><stop offset=".8" stop-color="#ff623e" stop-opacity=".35"/><stop offset="1" stop-color="#ff623e" stop-opacity="0"/></radialGradient>
  <radialGradient id="outer-fire"><stop stop-color="#ffd277" stop-opacity=".8"/><stop offset=".3" stop-color="#ffa044" stop-opacity=".7"/><stop offset=".65" stop-color="#ff6738" stop-opacity=".4"/><stop offset="1" stop-color="#ff5130" stop-opacity="0"/></radialGradient>
  <linearGradient id="jet" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#fff6d0" stop-opacity=".95"/><stop offset=".25" stop-color="#ffdf87" stop-opacity=".85"/><stop offset=".6" stop-color="#ff9947" stop-opacity=".85"/><stop offset="1" stop-color="#ff653e" stop-opacity=".2"/></linearGradient>
</defs>`;

function sheet(module, name, width, height, frames, anchor, draw) {
  const slug = `${module}-effect-sheet-v2`;
  sheets.push({module,name,width,height,frames,anchor,svg:`svg/${slug}.svg`,png:`png/${slug}.png`,exportScale:2});
  if(selected && module!==selected)return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width*frames}" height="${height}" viewBox="0 0 ${width*frames} ${height}"><title>${name}</title><desc>Horizontal editable flipbook. ${frames} frames, each ${width} by ${height}. Runtime supplies movement, scale and timing.</desc>${defs}${Array.from({length:frames},(_,i)=>`<g id="frame-${i}" transform="translate(${i*width} 0)">${draw(i)}</g>`).join('')}</svg>`;
  fs.writeFileSync(path.join(root,'svg',slug+'.svg'),svg+'\n');
  const result = spawnSync(inkscape,[path.join(root,'svg',slug+'.svg'),'--export-area-page','--export-background-opacity=0',`--export-width=${width*frames*2}`,`--export-filename=${path.join(root,'png',slug+'.png')}`],{encoding:'utf8',windowsHide:true});
  if(result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  console.log(`Exported ${module} flipbook (${frames} frames)`);
}

sheet('cannon','Auto Cannon hot tracer',64,64,4,[32,22],i=>`
  <ellipse cx="32" cy="24" rx="12" ry="17" fill="url(#cyan)" opacity=".6"/>
  <path d="M28 24H36L${34+i*.3} 58H${30-i*.3}Z" fill="url(#trail)"/>
  <path d="M30 15Q32 12 34 15L35 28H29Z" fill="#e9ffff"/>
  <path d="M31 27H33L32 ${48+i*2}Z" fill="#c1faff" opacity=".8"/>`);

sheet('scatter','Scatter Array single small pellet',64,64,4,[32,23],i=>`
  <ellipse cx="32" cy="25" rx="13" ry="16" fill="url(#warm)" opacity=".3"/>
  <path d="M27 27H37L34 ${46+i*2}H30Z" fill="#ffc896" opacity=".3"/>
  <ellipse cx="32" cy="23" rx="7" ry="8" fill="#fff2d6"/>
  <ellipse cx="32" cy="21" rx="4" ry="5" fill="#fffdf5"/>`);

sheet('missile','Missile Pod rocket and engine flicker',64,96,4,[32,38],i=>`
  <ellipse cx="32" cy="68" rx="13" ry="22" fill="url(#warm)" opacity=".5"/>
  <path d="M25 56H39L${35+i%2} ${83-i*3}H29Z" fill="#ffd58b" opacity=".55"/>
  <path d="M29 56H35L32 ${73+i*2}Z" fill="#fff8da"/>
  <path d="M24 43 15 56 25 53H39L49 56 40 43Z" fill="#a9bec8" stroke="#263842" stroke-width="2"/>
  <path d="M24 28 32 12 40 28V53L36 58H28L24 53Z" fill="#d6e4e8" stroke="#273a44" stroke-width="2"/>
  <path d="M24 28 32 12 40 28Z" fill="#d86e65"/>
  <path d="M28 31V48" stroke="#f5ffff" stroke-width="3" stroke-linecap="round"/>`);

sheet('cryo','Cryo Projector frost comet',64,64,6,[32,23],i=>`
  <ellipse cx="32" cy="29" rx="18" ry="25" fill="url(#ice)"/>
  <path d="M22 25Q${19+i%3*2} 40 25 53L30 35 32 58 37 37 42 ${46-i%3*3} 42 27Z" fill="#92d8ff" opacity=".23"/>
  <ellipse cx="32" cy="23" rx="9" ry="11" fill="#b8edff" opacity=".8"/>
  <ellipse cx="32" cy="21" rx="5" ry="7" fill="#f0fdff"/>
  <path d="M${19+i%2*3} 37 21 42 17 45 15 40Z M44 ${37+i%3*3} 48 43 45 47 42 41Z" fill="#bceaff" opacity=".6"/>`);

sheet('ember','Ember Projector moving flame packets',128,128,8,[64,120],i=>{
  let shapes='';
  const sway=Math.sin(i*Math.PI/4)*5;
  const ribbon=`M60 120Q51 94 ${57+sway} 70Q66 46 ${61+sway} 24Q79 41 ${69+sway} 64Q83 96 68 120Z`;
  shapes+=`<path d="${ribbon}" transform="rotate(-22 64 120)" fill="url(#jet)" opacity=".5"/><path d="${ribbon}" transform="rotate(22 64 120)" fill="url(#jet)" opacity=".5"/><path d="${ribbon}" fill="url(#jet)" opacity=".8"/>`;
  for(let lane=0;lane<5;lane++)for(let packet=0;packet<6;packet++) {
    const angle=(lane-2)*.2, travel=(packet/6+i/8*.28+lane*.037)%1;
    const x=64+Math.sin(angle)*travel*102, y=115-travel*91;
    const size=5+travel*12, sway=Math.sin(i*.8+packet*2+lane)*size*.12;
    shapes+=`<ellipse cx="${x+sway}" cy="${y}" rx="${size*.8}" ry="${11+travel*11}" transform="rotate(${angle*35} ${x+sway} ${y})" fill="url(#${travel>.45?'outer-fire':'fire-packet'})" opacity="${.5-travel*.12}"/>`;
  }
  return `${shapes}<ellipse cx="64" cy="110" rx="6" ry="14" fill="url(#fire-packet)"/><ellipse cx="64" cy="116" rx="3" ry="7" fill="#fff1c4" opacity=".85"/>`;
});

sheet('gravity','Gravity Well inward energy wisp',96,96,4,[48,48],i=>`
  <ellipse cx="47" cy="46" rx="17" ry="29" fill="url(#violet)" opacity=".7"/>
  <path d="M${39+i} 72Q24 47 48 21 36 44 51 59Z" fill="#cbb2f6" opacity=".65"/>
  <path d="M43 61Q35 44 48 25" fill="none" stroke="#f4eaff" stroke-width="3" opacity=".95"/>`);

sheet('pulse','Pulse Nova energy edge',256,256,6,[128,128],i=>`
  <circle cx="128" cy="128" r="104" fill="none" stroke="#54f4ff" stroke-width="${12-i}" opacity=".06"/>
  <circle cx="128" cy="128" r="104" fill="none" stroke="#7eeeff" stroke-width="${5-i*.4}" opacity=".35"/>
  <circle cx="128" cy="128" r="104" fill="none" stroke="#ebfeff" stroke-width="${2.3-i*.2}" opacity=".9"/>
  <circle cx="128" cy="128" r="${100-i*.7}" fill="none" stroke="#62e5ff" stroke-width="1.5" opacity=".18"/>`);

sheet('flak','Flak Battery detonation flipbook',128,128,8,[64,64],i=>{
  const t=i/7;
  let sparks='';
  for(let ray=0;ray<13;ray++) {
    const a=ray*2.39996+.23, speed=29+(ray%5)*6, r=3+t*speed, end=Math.min(60,r+2+(1-t)*(3+ray%4));
    sparks+=`<path d="M${64+Math.cos(a)*r} ${64+Math.sin(a)*r}L${64+Math.cos(a)*end} ${64+Math.sin(a)*end}" stroke="#ffe3ae" stroke-width="${Math.max(.7,1.7-t)}" opacity="${(1-t)*.9}"/>`;
  }
  return `<ellipse cx="64" cy="64" rx="${18+t*20}" ry="${16+t*15}" fill="url(#warm)" opacity="${(1-t)*(1-t)*.7}"/>${sparks}<circle cx="64" cy="64" r="${Math.max(0,6-i*1.4)}" fill="#fff8db" opacity="${(1-t)*(1-t)}"/>`;
});

fs.writeFileSync(path.join(root,'sheets.json'),JSON.stringify({version:2,status:'animated-review-candidate',sheets},null,2)+'\n');
