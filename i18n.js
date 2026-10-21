(function () {
  "use strict";

  // English source text is the lookup key, so untranslated text always falls back to English.
  var LANGUAGES = [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "it", name: "Italiano" },
    { code: "de", name: "Deutsch" },
    { code: "es", name: "Español (España)" },
    { code: "es-419", name: "Español (Latinoamérica)" },
    { code: "zh-Hans", name: "简体中文" },
    { code: "zh-Hant", name: "繁體中文" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
    { code: "pl", name: "Polski" },
    { code: "pt-BR", name: "Português (Brasil)" },
    { code: "ru", name: "Русский" },
    { code: "th", name: "ไทย" },
    { code: "tr", name: "Türkçe" },
    { code: "uz", name: "Oʻzbekcha" }
  ];
  var STORAGE_KEY = "bastion-language";
  var TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label"];

  var locales = window.BastionLocales = window.BastionLocales || {};

  function isSupported(code) {
    return LANGUAGES.some(function (language) { return language.code === code; });
  }

  function matchBrowserLanguage(tag) {
    var lower = String(tag || "").toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(lower)) return "zh-Hant";
    if (lower.indexOf("zh") === 0) return "zh-Hans";
    if (lower === "es" || lower === "es-es") return "es";
    if (lower.indexOf("es-") === 0) return "es-419";
    if (lower.indexOf("pt") === 0) return "pt-BR";
    var base = lower.split("-")[0];
    return isSupported(base) ? base : null;
  }

  function readStoredLanguage() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (error) { return null; }
  }

  function detectLanguage() {
    var stored = readStoredLanguage();
    if (isSupported(stored)) return stored;
    var preferred = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < preferred.length; i += 1) {
      var match = matchBrowserLanguage(preferred[i]);
      if (match) return match;
    }
    return "en";
  }

  var language = detectLanguage();
  document.documentElement.lang = language;

  function format(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (placeholder, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : placeholder;
    });
  }

  function translate(text, vars) {
    var table = locales[language];
    var translated = table && Object.prototype.hasOwnProperty.call(table, text) ? table[text] : text;
    return format(translated, vars);
  }

  function translateTextNode(node) {
    var raw = node.nodeValue;
    var trimmed = raw.trim();
    if (!trimmed) return;
    var translated = translate(trimmed);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }

  // Static markup is translated in place once; text that code builds at runtime calls tr() itself.
  function translateTree(root) {
    if (language === "en" || !locales[language]) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        return parent && (parent.nodeName === "SCRIPT" || parent.nodeName === "STYLE") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(translateTextNode);
    TRANSLATABLE_ATTRIBUTES.forEach(function (attribute) {
      root.querySelectorAll("[" + attribute + "]").forEach(function (element) {
        element.setAttribute(attribute, translate(element.getAttribute(attribute)));
      });
    });
  }

  function setLanguage(code) {
    if (!isSupported(code)) return false;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (error) { return false; }
    return true;
  }

  // Runs after every startup script, including the menus pc-ui.js builds after game.js.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { translateTree(document.body); });
  } else {
    translateTree(document.body);
  }

  window.tr = translate;
  window.BastionI18n = {
    languages: LANGUAGES.slice(),
    language: function () { return language; },
    setLanguage: setLanguage,
    translateTree: translateTree,
    matchBrowserLanguage: matchBrowserLanguage
  };
})();
