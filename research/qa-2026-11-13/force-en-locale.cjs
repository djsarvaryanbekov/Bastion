"use strict";
// Test-only preload (NODE_OPTIONS=--require): makes every Playwright context default to en-US.
// The game auto-detects the browser language, and this PC's Chromium reports Russian, which breaks
// the English-text assertions in the older browser checks.
const playwright = require("playwright");
for (const type of [playwright.chromium, playwright.firefox, playwright.webkit]) {
  const launch = type.launch.bind(type);
  type.launch = async (options = {}) => {
    const browser = await launch(Object.assign({}, options, { args: [...(options.args || []), "--lang=en-US"] }));
    const newContext = browser.newContext.bind(browser);
    const newPage = browser.newPage.bind(browser);
    browser.newContext = (o = {}) => newContext(Object.assign({ locale: "en-US" }, o));
    browser.newPage = (o = {}) => newPage(Object.assign({ locale: "en-US" }, o));
    return browser;
  };
}
