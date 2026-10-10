"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "outputs/Drift_Bastion_Playtest.html");
const output = path.resolve(process.argv[2] || path.join(root, "outputs/Drift_Bastion_Mobile.html"));
if (output === source) throw new Error("Mobile export must not overwrite the PC game.");
let html = fs.readFileSync(source, "utf8").replace(/\r\n?/g, "\n");

function replaceOnce(marker, replacement) {
  if (html.split(marker).length !== 2) throw new Error("Mobile export source changed: " + marker);
  html = html.replace(marker, replacement);
}

// Route touch through the existing cursor-follow controller. Combat, acceleration,
// turn limits and coasting remain identical to the authoritative game.
replaceOnce('if (event.pointerType !== "mouse" || event.button !== 0 || !game || game.state !== "playing" || game.finished) return;',
  'if (!event.isPrimary || event.button !== 0 || !game || game.state !== "playing" || game.finished || mouseInput.active) return;');
replaceOnce('if (event.pointerType !== "mouse" || !mouseInput.active || event.pointerId !== mouseInput.pointerId) return;',
  'if (!mouseInput.active || event.pointerId !== mouseInput.pointerId) return;');
replaceOnce('if (!(event.buttons & 1)) { resetMouseInput(); return; }',
  'if (event.pointerType === "mouse" && !(event.buttons & 1)) { resetMouseInput(); return; }');
replaceOnce('function supportsFloatingJoystick(event) {',
  'function supportsFloatingJoystick(event) { return false; // Mobile export uses cursor-follow steering.');
replaceOnce('function requestMobileFullscreen() {',
  'function requestMobileFullscreen() { return; // Export fullscreen is owned by mobile-share.js.');

// This review copy has its own save, backup, legacy migration and telemetry keys.
html = html.replaceAll('"drift-bastion-save-v2"', '"drift-bastion-mobile-review-save-v2"')
  .replaceAll('"drift-bastion-save-v1"', '"drift-bastion-mobile-review-save-v1"')
  .replaceAll('"drift-bastion-playtest-v1"', '"drift-bastion-mobile-review-playtest-v1"');
replaceOnce('<body class="pc-game pc-ui-pending">', '<body class="pc-game pc-ui-pending mobile-share">');
replaceOnce('</head>', '<style>\n' + fs.readFileSync(path.join(root, "mobile-v21.css"), "utf8") + '\n' +
  fs.readFileSync(path.join(root, "mobile-share.css"), "utf8") + '\n</style>\n</head>');
replaceOnce('</body>', '<script>\n' + fs.readFileSync(path.join(root, "mobile-share.js"), "utf8").replace(/<\/script/gi, "<\\/script") + '\n</script>\n</body>');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
