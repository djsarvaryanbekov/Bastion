"use strict";
// Required at the top of browser checks: the game follows the browser language, and Chromium on a
// non-English machine would otherwise run every English-text assertion against a translated UI.
const playwright = require("playwright");

const LOCALE = "en-US";
const patched = Symbol.for("bastion.englishLocale");

for (const type of [playwright.chromium, playwright.firefox, playwright.webkit]) {
  if (type[patched]) continue;
  type[patched] = true;
  const launch = type.launch.bind(type);
  type.launch = async (options = {}) => {
    const args = type === playwright.chromium ? [...(options.args || []), "--lang=" + LOCALE] : options.args;
    const browser = await launch(Object.assign({}, options, args ? { args } : {}));
    const newContext = browser.newContext.bind(browser);
    const newPage = browser.newPage.bind(browser);
    browser.newContext = (contextOptions = {}) => newContext(Object.assign({ locale: LOCALE }, contextOptions));
    browser.newPage = (pageOptions = {}) => newPage(Object.assign({ locale: LOCALE }, pageOptions));
    return browser;
  };
}
