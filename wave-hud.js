(function () {
  "use strict";

  // Top-centre wave readout. One bar in one place answers "how long / how many / how hurt is the boss",
  // and the route under it shows the climb to the next boss. game.js decides what to show; this only draws it.
  // model: null (hidden) or { kind: "timer" | "sweep" | "boss" | "text", titleHtml, rightHtml,
  //   fraction (0..1, or null to hide the bar), urgent, route: null | { first, last, current, bossIcon } }

  function create(elements) {
    var root = elements.root;
    var title = elements.title;
    var right = elements.right;
    var fill = elements.fill;
    var route = elements.route;
    if (!root || !title || !right || !fill || !route) throw new Error("Wave HUD is missing a required element.");
    var written = {};

    function write(key, value, apply) {
      if (written[key] === value) return;
      written[key] = value;
      apply(value);
    }

    function routeKey(data) {
      return data ? data.first + ":" + data.last + ":" + data.current + ":" + data.bossIcon : "";
    }

    function buildRoute(data) {
      route.textContent = "";
      if (!data) return;
      for (var wave = data.first; wave <= data.last; wave += 1) {
        if (wave > data.first) route.appendChild(node("span", "wave-hud-link"));
        var isBoss = wave === data.last;
        var state = wave < data.current ? " done" : (wave === data.current ? " now" : "");
        var step = node("span", (isBoss ? "wave-hud-boss" : "wave-hud-pip") + state);
        if (isBoss && data.bossIcon) step.style.backgroundImage = "url(\"" + data.bossIcon + "\")";
        route.appendChild(step);
      }
    }

    function node(tag, className) {
      var element = document.createElement(tag);
      element.className = className;
      return element;
    }

    return {
      render: function (model) {
        write("visible", model ? "1" : "0", function (value) { root.classList.toggle("hidden", value !== "1"); });
        if (!model) return;
        var previousKind = written.kind;
        write("kind", model.kind, function (value) {
          if (previousKind) root.classList.remove("kind-" + previousKind);
          root.classList.add("kind-" + value);
        });
        write("urgent", model.urgent ? "1" : "0", function (value) { root.classList.toggle("urgent", value === "1"); });
        write("title", model.titleHtml || "", function (value) { title.innerHTML = value; });
        write("right", model.rightHtml || "", function (value) { right.innerHTML = value; });
        var hasBar = typeof model.fraction === "number";
        write("bar", hasBar ? "1" : "0", function (value) { root.classList.toggle("no-bar", value !== "1"); });
        if (hasBar) {
          var width = (Math.max(0, Math.min(1, model.fraction)) * 100).toFixed(1) + "%";
          write("fill", width, function (value) { fill.style.width = value; });
        }
        write("route", routeKey(model.route), function () { buildRoute(model.route); });
      }
    };
  }

  window.DriftWaveHud = { create: create };
})();
