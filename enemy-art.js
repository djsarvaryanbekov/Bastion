(function (root) {
  "use strict";

  var data = root.DriftEnemyArtData || {};
  var images = Object.create(null);
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

  function draw(context, type, x, y, radius, rotation) {
    var sprite = data[type];
    var image = images[type];
    if (!sprite || !image || !available(type)) return false;
    var longest = Math.max(image.naturalWidth, image.naturalHeight);
    var scale = radius * 2 * sprite.scale / longest;
    context.save();
    context.translate(x, y);
    context.rotate((rotation || 0) - (sprite.forward || 0) * Math.PI / 180);
    context.drawImage(image, -image.naturalWidth * scale * .5, -image.naturalHeight * scale * .5, image.naturalWidth * scale, image.naturalHeight * scale);
    context.restore();
    return true;
  }

  function displaySize(type, radius) {
    var sprite = data[type];
    if (!sprite) return 0;
    // The square cache needs breathing room for a long sniper hull and wide gunner.
    return Math.ceil(radius * 2 * sprite.scale + 16);
  }

  root.DriftEnemyArt = {
    ready: Promise.all(pending),
    available: available,
    draw: draw,
    displaySize: displaySize,
    types: Object.keys(data)
  };
})(window);
