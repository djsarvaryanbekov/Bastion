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
  html = html.replace(marker, () => replacement);
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n?/g, "\n");
}

// The phone build ships English, Russian and Uzbek only. Translations come from locales/*.json,
// packed like tools/build-locales.cjs, so mobile-only strings do not wait for a PC rebuild.
const MOBILE_LANGUAGES = ["en", "ru", "uz"];

function mobileLocaleBundle() {
  const catalog = JSON.parse(readSource("locales/en.json"));
  const bundle = {};
  MOBILE_LANGUAGES.filter(code => code !== "en").forEach(code => {
    const table = JSON.parse(readSource("locales/" + code + ".json"));
    bundle[code] = {};
    Object.keys(catalog).forEach(key => {
      if (typeof table[key] === "string" && table[key]) bundle[code][key] = table[key];
    });
  });
  return "window.BastionLocales = " + JSON.stringify(bundle).replace(/<\/script/gi, "<\\/script") + ";";
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

const localeLines = html.match(/^window\.BastionLocales = \{.*\};$/gm) || [];
if (localeLines.length !== 1) throw new Error("Mobile export source changed: inlined locales.js");
replaceOnce(localeLines[0], mobileLocaleBundle());
replaceOnce('  var STORAGE_KEY = "bastion-language";',
  '  LANGUAGES = LANGUAGES.filter(function (language) { return ' + JSON.stringify(MOBILE_LANGUAGES) + '.indexOf(language.code) >= 0; });\n' +
  '  var STORAGE_KEY = "bastion-language";');

// This review copy has its own save, backup, legacy migration and telemetry keys.
html = html.replaceAll('"drift-bastion-save-v2"', '"drift-bastion-mobile-review-save-v2"')
  .replaceAll('"drift-bastion-save-v1"', '"drift-bastion-mobile-review-save-v1"')
  .replaceAll('"drift-bastion-playtest-v1"', '"drift-bastion-mobile-review-playtest-v1"');
replaceOnce('<body class="pc-game pc-ui-pending">', '<body class="pc-game pc-ui-pending mobile-share">');
replaceOnce('</head>', '<style>\n' + ["mobile-v21.css", "mobile-share.css", "mobile-landscape.css"].map(readSource).join("\n") + '\n</style>\n</head>');
replaceOnce('</body>', '<script>\n' + readSource("mobile-share.js").replace(/<\/script/gi, "<\\/script") + '\n</script>\n</body>');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
