"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "outputs");
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(outputDirectory, "Drift_Bastion_Playtest.html");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n?/g, "\n");
}

function replaceExactly(source, marker, replacement) {
  const first = source.indexOf(marker);
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`Expected exactly one build marker: ${marker}`);
  }
  return source.replace(marker, replacement);
}

function safeInlineScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

let html = read("index.html");
const css = read("styles.css");
const telemetry = safeInlineScript(read("telemetry.js"));
const game = safeInlineScript(read("game.js"));
const progression = safeInlineScript(read("progression.js"));
const upgrades = safeInlineScript(read("run-upgrades.js"));
const campaign = safeInlineScript(read("campaign.js"));

html = html
  .replace(/^\s*<link rel="manifest"[^>]*>\s*$/m, "")
  .replace(/^\s*<link rel="icon" href="\.\/icon\.svg"[^>]*>\s*$/m, "")
  .replace(/^\s*<link rel="apple-touch-icon"[^>]*>\s*$/m, "");
html = replaceExactly(html, '  <link rel="stylesheet" href="styles.css">', `  <style>\n${css}\n  </style>`);
html = replaceExactly(html, '  <link rel="stylesheet" href="training.css">', `  <style>\n${read("training.css")}\n  </style>`);
html = replaceExactly(html, '  <script src="telemetry.js"></script>', `  <script>\n${telemetry}\n  </script>`);
html = replaceExactly(html, '  <script src="progression.js"></script>', `  <script>\n${progression}\n  </script>`);
html = replaceExactly(html, '  <script src="run-upgrades.js"></script>', `  <script>\n${upgrades}\n  </script>`);
html = replaceExactly(html, '  <script src="campaign.js"></script>', `  <script>\n${campaign}\n  </script>`);
["progression-view.js", "training.js", "training-arena.js", "training-view.js", "upgrade-tree-view.js", "module-art-data.js", "module-art.js", "enemy-art-data.js", "enemy-art.js"].forEach(file => {
  html = replaceExactly(html, '  <script src="' + file + '"></script>', `  <script>\n${safeInlineScript(read(file))}\n  </script>`);
});
html = replaceExactly(html, '  <link rel="stylesheet" href="pc-ui.css">', `<style>\n${read("pc-ui.css")}\n</style>`);
["test-range.js", "pc-research.js", "pc-systems.js", "combat-audio.js", "weapon-feedback.js", "weapon-muzzles.js", "ship-handling.js", "combat-feedback.js", "ship-debris.js", "shield-vfx.js", "attack-vfx-data.js", "attack-vfx.js", "fire-vfx.js", "cold-vfx.js", "pc-build.js", "pc-ui.js"].forEach(file => { html = replaceExactly(html, '  <script src="' + file + '"></script>', `<script>\n${safeInlineScript(read(file))}\n</script>`); });
html = replaceExactly(html, '  <link rel="stylesheet" href="pc-workspaces.css">', `<style>\n${read("pc-workspaces.css")}\n</style>`);
html = replaceExactly(html, '  <script src="game.js"></script>', `  <script>\n${game}\n  </script>`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");
console.log(outputPath);
