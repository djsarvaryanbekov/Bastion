"use strict";

// Validates locales/<code>.json against the English catalog. Usage: node tools/check-locales.cjs [code ...]
const fs = require("fs");
const path = require("path");

const localesDirectory = path.join(path.resolve(__dirname, ".."), "locales");
const catalog = JSON.parse(fs.readFileSync(path.join(localesDirectory, "en.json"), "utf8"));
const keys = Object.keys(catalog);
const requested = process.argv.slice(2);
const codes = requested.length ? requested : fs.readdirSync(localesDirectory)
  .filter(file => file.endsWith(".json") && file !== "en.json").map(file => file.replace(/\.json$/, ""));

function placeholders(text) {
  return (text.match(/\{\w+\}/g) || []).sort().join(",");
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

// Code splits or parses these shapes, so translations must keep them.
const STRUCTURE_RULES = [
  { name: "' · ' separators", test: key => key.indexOf(" · ") >= 0, check: (key, value) => count(value, " · ") === count(key, " · ") },
  { name: "'{cost} F' ending", test: key => / \{cost\} F$/.test(key), check: (key, value) => /\{cost\} F$/.test(value) },
  { name: "trailing ' +N%' shape", test: key => / [+-][\d.]+%$/.test(key), check: (key, value) => / [+-][\d.]+%$/.test(value) },
  { name: "leading/trailing spaces", test: key => /^\s|\s$/.test(key), check: (key, value) => /^\s/.test(value) === /^\s/.test(key) && /\s$/.test(value) === /\s$/.test(key) }
];

let failed = false;
codes.forEach(code => {
  const file = path.join(localesDirectory, code + ".json");
  if (!fs.existsSync(file)) { console.log(code + ": MISSING FILE"); failed = true; return; }
  const table = JSON.parse(fs.readFileSync(file, "utf8"));
  const problems = [];
  keys.forEach(key => {
    const value = table[key];
    if (typeof value !== "string" || !value.trim()) { problems.push("missing: " + key); return; }
    if (placeholders(value) !== placeholders(key)) problems.push("placeholders: " + key + " => " + value);
    STRUCTURE_RULES.forEach(rule => {
      if (rule.test(key) && !rule.check(key, value)) problems.push(rule.name + ": " + key + " => " + value);
    });
  });
  const extra = Object.keys(table).filter(key => !Object.prototype.hasOwnProperty.call(catalog, key));
  console.log(code + ": " + (problems.length ? problems.length + " problem(s)" : "ok") + (extra.length ? ", " + extra.length + " stale key(s)" : ""));
  problems.slice(0, 40).forEach(problem => console.log("  " + problem));
  if (problems.length) failed = true;
});
process.exitCode = failed ? 1 : 0;
