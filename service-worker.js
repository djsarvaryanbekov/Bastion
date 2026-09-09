"use strict";

var CACHE_NAME = "drift-bastion-v25-bastion";
var APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./training.css",
  "./module-preview.css",
  "./module-preview.js",
  "./module-preview-panel.js",
  "./telemetry.js",
  "./progression.js",
  "./progression-view.js",
  "./run-upgrades.js",
  "./campaign.js",
  "./training.js",
  "./training-arena.js",
  "./training-view.js",
  "./game.js",
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
