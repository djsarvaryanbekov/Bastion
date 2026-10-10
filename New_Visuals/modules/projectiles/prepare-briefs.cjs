"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");

const project = path.resolve(__dirname,"../../..");
if(fs.existsSync(path.join(__dirname,"generation-manifest.json"))) throw new Error("Existing briefs and generation history must be preserved; edit them explicitly instead of recreating them");
const source = fs.readFileSync(path.join(project,"game.js"),"utf8");
const begin = source.indexOf("    var MODULES = {");
const end = source.indexOf("    var WEAPON_TYPES =",begin);
if(begin<0 || end<0) throw new Error("Cannot locate the weapon catalog");
const modules = vm.runInNewContext(source.slice(begin,end)+"\nMODULES;");
const types = vm.runInNewContext(source.slice(end,source.indexOf(";",end)+1)+"\nWEAPON_TYPES;");

const shared = `Generate one original game-ready concept sprite for this weapon's attack, using the attached module image as a visual-family reference. The attachment is the weapon that fires this attack: do not redraw the weapon, its mount, or a platform.

Match its clean illustrated sci-fi treatment: confident contours, broad readable forms, simple faceted highlights and controlled shading. Physical ammunition can use the reference's pale metal and graphite. Energy must read as energy, with a clearly visible luminous core and a restrained colored edge; do not turn beams, lightning, flames or fields into metal ornaments or faint wireframes. Keep the silhouette understandable at small gameplay sizes on a dark navy battlefield. Avoid tiny greebles, cloudy photorealistic texture, excessive bloom, decorative geometry and large smoke clouds. Enemy shots use warm orange warnings, so friendly fire must retain its specific identity.

Output one isolated asset, centered with generous transparent margins, as a PNG with real alpha transparency. Preferred square canvas 1024x1024. No painted checkerboard, background, scene, labels, text, arrows, turret, tile, collage, comparison sheet or additional variants. Directional attacks point upward; radial attacks are centered. Preserve clear shape over tiny surface detail. This is artwork development only and does not change gameplay.`;

const designs = [
  ["cannon","auto-cannon-v2.png","auto-cannon-round",
    "One compact kinetic cannon round, with a bright readable head, a simple pale-metal tip and a short restrained cyan tracer behind it. Its visual identity is fast, steady gunfire. Make a small strong silhouette, not a miniature complex machine or a long laser beam. The cyan is an accent, not a large glow cloud."],
  ["laser","piercing-laser-v2.png","piercing-laser-beam",
    "One straight piercing laser beam: a narrow continuous bright pale core with a violet energy edge. Elongated vertical composition, consistent shaft width and restrained end caps so it can later be sliced into beam pieces. It must look forceful and readable, not faint, metallic, jagged or like a lightning bolt. No impact explosion or emitter."],
  ["missile","missile-pod-v5.png","homing-missile",
    "One compact homing missile seen from directly overhead, with the reference launcher's red nose, a pale metal body, two simple fins, dark contours and a short warm exhaust. Use the visible red missile noses in the attachment as the design cue. The missile is a solid readable object; the exhaust is subordinate. No launch pod or giant trail."],
  ["scatter","scatter-array-v28.png","scatter-pellet",
    "One short chunky scatter pellet with a warm pale center and a small peach-orange tracer. It should read as a close-range kinetic pellet, clearly shorter and wider than the Cannon round. Make one pellet only; the game supplies the five-shot cone. Do not bake a whole volley, muzzle flash, cloud or gun into the image."],
  ["arc","arc-emitter-v16.png","arc-lightning-segment",
    "One strong mint-green electrical arc segment with a bright pale core, a few deliberate angular bends and at most two small subordinate branches. Make a clean connected lightning shape with simple energy edges, not a straight laser, thin dim string, outlined metal strip or dense web of sparks. Its dominant path runs vertically and remains readable when connecting enemies."],
  ["rail","rail-lance-v1.png","rail-slug",
    "One fast heavy piercing rail slug, slim and longer than the Cannon round, with a bright small leading tip and a compact magenta-pink wake. Preserve the reference's clean machined treatment on the small solid slug. Let its directional speed trail distinguish it from a missile and a continuous laser; no fins, exhaust cloud or decorative zigzags."],
  ["flak","flak-battery-v6.png","flak-airburst",
    "One compact anti-projectile airburst at the moment of detonation: a clearly visible warm pale center with a small amber-orange burst and a limited number of broad radial fragments. It must read as a brief defensive burst, with a mostly open surrounding area, not a huge fireball or dense particle cloud. Current Flak detonates at its target; do not invent a flying missile or shell launcher."],
  ["pulse","pulse-nova-v1.png","pulse-nova-wave",
    "One centered circular cyan energy shockwave ring with an open genuinely transparent interior. A bright thin leading edge and a restrained softer cyan inner falloff should make the expanding wave legible. Keep the radius clear, the ring continuous and the center uncluttered. No device, metal ring, hexagonal ornament, shield bubble or opaque disk."],
  ["cryo","cryo-projector-v1.png","cryo-bolt",
    "One compact freezing bolt: a bright pale icy-blue head with a few broad crisp crystal facets and a short blue frost wake. It should feel like compressed freezing energy, with a clear direction and solid visual focus. Do not make a detailed snowflake icon, metal rocket, huge frosty cloud or many disconnected shards."],
  ["mine","mine-layer-v1.png","proximity-mine",
    "One round deployed proximity mine seen directly overhead. Use the exposed dark mine puck and amber armed light in the attached dispenser as its exact design cues: a compact graphite puck, simple pale-metal rim and one strong amber indicator. Keep broad readable geometry. No dispenser, barrels, trail, explosion or elaborate spikes; this object sits in an approaching enemy lane."],
  ["ember","ember-projector-v1.png","ember-flame-cone",
    "One compact upward flame jet that opens into a short cone. Use a small pale-yellow hot base, clearly visible orange flame lobes and a restrained red outer edge. Give it a cohesive flame silhouette with a few readable tongues, rather than geometric triangles, straight rays, realistic smoky fire or dozens of tiny particles. Origin at the lower center, cone opening upward. No nozzle or weapon."],
  ["gravity","gravity-well-v1.png","gravity-well-field",
    "One centered violet gravity field with a mostly transparent interior, a clear circular influence boundary and a small dark central well. A few broad inward-curving violet streams should communicate suction while leaving enemies inside the field visible. Follow the attachment's restrained violet energy identity. No emitter jaws, metal medallion, huge opaque vortex, lightning web or decorative concentric ring stack."]
];

if(designs.length!==types.length || designs.some(([type])=>!types.includes(type))) throw new Error("Briefs do not cover the actual weapon families");
const manifest={requestedOn:"2026-10-08",status:"blocked-no-chrome-extension-connection",route:"chrome-chatgpt-imagegen",
  sharedPrompt:shared,generatedImages:0,assets:[]};
fs.mkdirSync(path.join(__dirname,"briefs"),{recursive:true});
for(const [type,file,slug,brief] of designs) {
  const reference=path.join(project,"New_Visuals/modules",file);
  const bytes=fs.readFileSync(reference);
  const prompt=`Weapon: ${modules[type].name}. Actual behavior: ${modules[type].description}\n\n${shared}\n\nSpecific asset brief:\n${brief}\n\nExisting attack color: ${modules[type].color}. Match that identity except where the attached physical ammunition provides a specific nose/armed-light color. Generate the image now.`;
  const promptFile=`briefs/${slug}-v1.txt`;
  fs.writeFileSync(path.join(__dirname,promptFile),prompt+"\n",{flag:"wx"});
  manifest.assets.push({module:type,name:modules[type].name,behavior:modules[type].description,color:modules[type].color,
    reference:`New_Visuals/modules/${file}`,referenceSha256:crypto.createHash("sha256").update(bytes).digest("hex"),
    prompt:promptFile,plannedRawOutput:`${slug}-v1.png`,chatUrl:null,status:"not-generated"});
}
fs.writeFileSync(path.join(__dirname,"generation-manifest.json"),JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
console.log(`Prepared ${manifest.assets.length} separate briefs. No images generated; no game files changed.`);
