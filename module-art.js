(function (root) {
  "use strict";
  var data = root.DriftModuleArtData || {};
  var images = Object.create(null);
  var icons = Object.create(null);
  var pending = Object.keys(data).map(function (type) {
    var image = new Image();
    images[type] = image;
    return new Promise(function (resolve) {
      image.onload = function () { resolve(true); };
      image.onerror = function () { resolve(false); };
      image.src = data[type].src;
    });
  });

  function available(type) {
    var image = images[type];
    return !!(image && image.complete && image.naturalWidth);
  }

  function draw(context, type, x, y, size, angle) {
    var sprite = data[type];
    if (!sprite || !available(type)) return false;
    context.save();
    context.translate(x, y);
    if (sprite.rotates) context.rotate((angle === undefined ? -Math.PI / 2 : angle) - sprite.forward * Math.PI / 180);
    context.drawImage(images[type], sprite.x * size, sprite.y * size, sprite.width * size, sprite.height * size);
    context.restore();
    return true;
  }

  function drawBase(context, type, x, y, size) {
    var sprite = data[type];
    if (sprite && sprite.integrated && available(type)) return draw(context, type, x, y, size);
    var drawn = draw(context, "platform", x, y, size);
    if (!sprite && drawn) {
      context.save();
      context.fillStyle = "#132937";
      context.fillRect(x - size * .38, y - size * .38, size * .76, size * .76);
      context.restore();
    }
    if (sprite && sprite.mount) draw(context, "mount", x, y, size);
    return drawn;
  }

  function drawEquipment(context, type, x, y, size, angle) {
    if (!available(type)) return false;
    return data[type].integrated || draw(context, type, x, y, size, angle);
  }

  function layerHtml(type, rotate) {
    var sprite = data[type];
    if (!sprite) return "";
    return '<image href="' + sprite.src + '" x="' + sprite.x + '" y="' + sprite.y + '" width="' + sprite.width + '" height="' + sprite.height + '"' + (rotate ? ' transform="rotate(' + (-90 - sprite.forward) + ')"' : "") + '/>';
  }

  function iconHtml(type, cell) {
    var sprite = data[type];
    if (!sprite) return "";
    var key = type + (cell ? ":cell" : ":icon");
    if (icons[key]) return icons[key];
    // Catalog icons contain the entire silhouette; build cells preserve tile pitch.
    var radius = .53;
    if (!cell) {
      radius = Math.max(radius, Math.abs(sprite.x), Math.abs(sprite.y), Math.abs(sprite.x + sprite.width), Math.abs(sprite.y + sprite.height));
    }
    var view = cell ? "-.5 -.5 1 1" : [-radius, -radius, radius * 2, radius * 2].join(" ");
    var content = sprite.integrated ? "" : layerHtml("platform", false) + (sprite.mount ? layerHtml("mount", false) : "");
    icons[key] = '<svg class="module-icon module-art' + (cell ? ' module-art-cell' : '') + '" viewBox="' + view + '" aria-hidden="true" focusable="false">' + content + layerHtml(type, sprite.rotates) + '</svg>';
    return icons[key];
  }

  root.DriftModuleArt = { ready: Promise.all(pending), available: available, drawBase: drawBase, drawEquipment: drawEquipment, iconHtml: iconHtml };
})(window);
