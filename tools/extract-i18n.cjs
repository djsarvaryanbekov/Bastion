"use strict";

// Collects every translatable English string into locales/en.json and reports what each locale is missing.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const localesDirectory = path.join(root, "locales");
const NON_SOURCE = /(-data\.js|service-worker\.js|locales\.js)$/;
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label"];

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

function hasLetters(text) {
  return /\p{L}/u.test(text);
}

// The regex guarantees body is a complete literal from this repository's own sources.
function unescapeJsString(body, quote) {
  return new Function("return " + quote + body + quote)();
}

function collectFromScripts(keys) {
  const pattern = /\btr\(\s*(["'])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  fs.readdirSync(root).filter(file => file.endsWith(".js") && !NON_SOURCE.test(file)).forEach(file => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    let match;
    while ((match = pattern.exec(source))) {
      const text = unescapeJsString(match[2], match[1]);
      if (hasLetters(text)) keys.add(text);
    }
  });
}

function collectFromMarkup(keys) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const textPattern = />([^<]+)</g;
  let match;
  while ((match = textPattern.exec(html))) {
    const text = decodeEntities(match[1]).trim();
    if (hasLetters(text)) keys.add(text);
  }
  TRANSLATABLE_ATTRIBUTES.forEach(attribute => {
    const attributePattern = new RegExp("\\s" + attribute + "=\"([^\"]*)\"", "g");
    while ((match = attributePattern.exec(html))) {
      const text = decodeEntities(match[1]).trim();
      if (hasLetters(text)) keys.add(text);
    }
  });
}

const keys = new Set();
collectFromScripts(keys);
collectFromMarkup(keys);
const sorted = Array.from(keys).sort();
const catalog = {};
sorted.forEach(key => { catalog[key] = key; });
fs.mkdirSync(localesDirectory, { recursive: true });
fs.writeFileSync(path.join(localesDirectory, "en.json"), JSON.stringify(catalog, null, 2) + "\n", "utf8");

const report = { strings: sorted.length, locales: {} };
fs.readdirSync(localesDirectory).filter(file => file.endsWith(".json") && file !== "en.json").forEach(file => {
  const table = JSON.parse(fs.readFileSync(path.join(localesDirectory, file), "utf8"));
  const missing = sorted.filter(key => typeof table[key] !== "string" || !table[key]);
  report.locales[file.replace(/\.json$/, "")] = { missing: missing.length };
});
console.log(JSON.stringify(report, null, 2));
