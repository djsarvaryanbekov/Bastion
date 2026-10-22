"use strict";

var CACHE_NAME = "drift-bastion-v58-waves";
var APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./training.css",
  "./locales.js",
  "./i18n.js",
  "./telemetry.js",
  "./waves.js",
  "./cards.js",
  "./progression.js",
  "./progression-view.js",
  "./run-upgrades.js",
  "./upgrade-tree-view.js",
  "./campaign.js",
  "./training.js",
  "./training-arena.js",
  "./training-view.js",
  "./game.js",
  "./combat-audio.js",
  "./weapon-feedback.js",
  "./ship-handling.js",
  "./weapon-muzzles.js",
  "./combat-feedback.js",
  "./ship-debris.js",
  "./shield-vfx.js",
  "./attack-vfx-data.js",
  "./attack-vfx.js",
  "./fire-vfx.js",
  "./cold-vfx.js",
  "./module-art-data.js",
  "./module-art.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(APP_SHELL);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.map(function (name) {
      return name === CACHE_NAME ? null : caches.delete(name);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(fetch(event.request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, copy);
      });
    }
    return response;
  }).catch(function () {
    return caches.match(event.request).then(function (cached) {
      return cached || caches.match("./index.html");
    });
  }));
});
