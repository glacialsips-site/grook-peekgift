/*
 * Mitti — shared studio art kit.
 * Pure, framework-free SVG generators for hand-thrown stoneware vessels.
 * Loaded as a classic <script> in the browser (sets window.MittiArt) and
 * require()'d by the Node video builder. No DOM, no deps.
 */
(function (root) {
  'use strict';

  /* ---- Glazes: mixed by hand, small batches. Indian-inspired palette. ---- */
  var GLAZES = {
    terracotta:  { name: 'Terracotta',   light: '#e0966a', base: '#bf6238', dark: '#8a3f22', fleck: '#6b2c16' },
    rust:        { name: 'Kiln Rust',    light: '#d6824f', base: '#a8502a', dark: '#6f3217', fleck: '#4d1f0d' },
    jaipur:      { name: 'Jaipur Blue',  light: '#74b0d2', base: '#2f74a4', dark: '#1a4870', fleck: '#0e2c47' },
    indigo:      { name: 'Indigo Salt',  light: '#6b7fbf', base: '#33417e', dark: '#1e2750', fleck: '#121838' },
    marigold:    { name: 'Marigold',     light: '#f7bd54', base: '#e08a1e', dark: '#a85f0f', fleck: '#6f3f0a' },
    haldi:       { name: 'Haldi',        light: '#f2c75a', base: '#d29a22', dark: '#9c6f12', fleck: '#674909' },
    saffron:     { name: 'Saffron',      light: '#f0a259', base: '#d96f29', dark: '#a44d17', fleck: '#6e310d' },
    neem:        { name: 'Neem Green',   light: '#a3b78c', base: '#6f8a55', dark: '#4a6038', fleck: '#2f3f23' },
    celadon:     { name: 'River Celadon',light: '#a8cabb', base: '#6c9a86', dark: '#456b5b', fleck: '#2c473b' },
    longpi:      { name: 'Longpi Black', light: '#5f5f66', base: '#34343c', dark: '#1c1c22', fleck: '#0c0c10' },
    riverstone:  { name: 'River Stone',  light: '#c3c0b6', base: '#928f84', dark: '#63605812', fleck: '#4d4a42' },
    oat:         { name: 'Raw Oat',      light: '#f1e7d3', base: '#ddcaa9', dark: '#b49b73', fleck: '#7d6743' },
    plum:        { name: 'Jamun',        light: '#9a6f9c', base: '#6a3f73', dark: '#43234c', fleck: '#2a1430' }
  };
  // fix a stray typo value defensively
  GLAZES.riverstone.dark = '#636058';

  /* ---- Profiles: radius of the thrown wall at a given height (cx = 130). ----
   * Coordinates live in a 260 x 320 frame, baseline (foot) near y ~ 270.    */
  var PROFILES = {
    kulhad:  [ [104,46],[128,47],[176,44],[212,37],[238,33] ],
    mug:     [ [98,46],[112,47],[206,47],[224,43],[232,40] ],
    tumbler: [ [100,40],[120,42],[200,46],[228,44],[238,40] ],
    bowl:    [ [122,84],[138,85],[168,80],[198,64],[220,42],[234,31] ],
    ramen:   [ [118,78],[134,80],[164,76],[194,60],[216,40],[230,30] ],
    vase:    [ [78,20],[96,17],[136,29],[182,57],[220,49],[244,38] ],
    bottle:  [ [60,16],[96,15],[120,21],[150,52],[196,62],[238,52],[262,41] ],
    surahi:  [ [58,15],[88,14],[110,18],[140,46],[176,60],[210,58],[244,46],[264,38] ],
    planter: [ [112,80],[132,76],[210,60],[236,54],[244,50] ],
    pitcher: [ [92,34],[110,41],[168,58],[210,55],[236,46],[244,42] ],
    plate:   [ [176,98],[186,94],[202,64],[214,46],[220,40] ]
  };

  var HAS_HANDLE = { mug: 1, pitcher: 1 };
  var HAS_SPOUT  = { pitcher: 1 };

  /* ---- tiny seeded RNG so speckle is deterministic per product ---- */
  function rng(seed) {
    var s = (seed * 2654435761) >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* ---- Catmull-Rom -> cubic bezier through an ordered point list ---- */
  function smooth(points) {
    if (points.length < 2) return '';
    var d = 'M' + points[0][0].toFixed(2) + ',' + points[0][1].toFixed(2);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(2) + ',' + c1y.toFixed(2) + ' ' +
                 c2x.toFixed(2) + ',' + c2y.toFixed(2) + ' ' +
                 p2[0].toFixed(2) + ',' + p2[1].toFixed(2);
    }
    return d;
  }

  /* Build the closed silhouette path string from a profile. */
  function silhouette(profile, cx) {
    var right = profile.map(function (p) { return [cx + p[1], p[0]]; });
    var left = profile.map(function (p) { return [cx - p[1], p[0]]; }).reverse();
    var loop = right.concat(left);
    return smooth(loop) + 'Z';
  }

  /*
   * vesselGroup(opts) -> { defs, group } strings you can drop into any SVG.
   * opts: { type, glaze (key), uid, seed, speckle (bool) }
   */
  function vesselGroup(opts) {
    var type = opts.type || 'mug';
    var g = GLAZES[opts.glaze] || GLAZES.terracotta;
    var uid = opts.uid != null ? opts.uid : 'v';
    var seed = opts.seed != null ? opts.seed : 7;
    var profile = PROFILES[type] || PROFILES.mug;
    var cx = 130;
    var topY = profile[0][0], topR = profile[0][1];
    var foot = profile[profile.length - 1];
    var footY = foot[0], footR = foot[1];

    var id = function (n) { return 'm' + uid + '_' + n; };
    var bodyPath = silhouette(profile, cx);

    // speckle dots (stoneware fleck), clipped to the body
    var fleck = '';
    if (opts.speckle !== false) {
      var rnd = rng(seed);
      var n = 46;
      for (var i = 0; i < n; i++) {
        var fx = cx - topR + rnd() * (topR * 2);
        var fy = topY + rnd() * (footY - topY);
        var fr = 0.7 + rnd() * 1.3;
        fleck += '<circle cx="' + fx.toFixed(1) + '" cy="' + fy.toFixed(1) +
                 '" r="' + fr.toFixed(1) + '" fill="' + g.fleck + '" opacity="' + (0.18 + rnd() * 0.28).toFixed(2) + '"/>';
      }
    }

    // handle (mug / pitcher) drawn behind the body so it reads as attached
    var handle = '';
    if (HAS_HANDLE[type]) {
      var hTop = topY + (type === 'pitcher' ? 18 : 22);
      var hBot = footY - 34;
      var hx = cx + topR - 4;
      var reach = type === 'pitcher' ? 60 : 56;
      handle =
        '<path d="M' + hx + ',' + hTop +
        ' C' + (hx + reach) + ',' + (hTop - 6) + ' ' + (hx + reach) + ',' + hBot + ' ' + hx + ',' + hBot + '"' +
        ' fill="none" stroke="url(#' + id('grad') + ')" stroke-width="15" stroke-linecap="round"/>' +
        '<path d="M' + hx + ',' + hTop +
        ' C' + (hx + reach) + ',' + (hTop - 6) + ' ' + (hx + reach) + ',' + hBot + ' ' + hx + ',' + hBot + '"' +
        ' fill="none" stroke="' + g.dark + '" stroke-width="15" stroke-linecap="round" opacity="0.25"/>';
    }

    // spout (pitcher) — a small lip on the front-left of the rim
    var spout = '';
    if (HAS_SPOUT[type]) {
      var sx = cx - topR;
      spout = '<path d="M' + (sx + 2) + ',' + (topY + 4) + ' q-22,-4 -30,10 q14,2 26,2 z" fill="url(#' + id('grad') + ')"/>';
    }

    var rimRy = Math.max(4, topR * 0.24);

    var defs =
      '<linearGradient id="' + id('grad') + '" x1="0" y1="' + topY + '" x2="0" y2="' + footY + '" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="' + g.light + '"/>' +
        '<stop offset="0.42" stop-color="' + g.base + '"/>' +
        '<stop offset="1" stop-color="' + g.dark + '"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + id('sheen') + '" cx="0.34" cy="0.26" r="0.7">' +
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0.40"/>' +
        '<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.06"/>' +
        '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + id('mouth') + '" cx="0.5" cy="0.5" r="0.5">' +
        '<stop offset="0" stop-color="' + g.dark + '"/>' +
        '<stop offset="0.75" stop-color="' + g.dark + '"/>' +
        '<stop offset="1" stop-color="' + g.base + '"/>' +
      '</radialGradient>' +
      '<clipPath id="' + id('clip') + '"><path d="' + bodyPath + '"/></clipPath>';

    var isOpen = type !== 'bottle' && type !== 'surahi' && type !== 'vase';

    var group =
      '<g>' +
        // contact shadow
        '<ellipse cx="' + cx + '" cy="' + (footY + 8) + '" rx="' + (footR * 1.7) + '" ry="9" fill="#1c140e" opacity="0.16"/>' +
        handle + spout +
        // body
        '<path d="' + bodyPath + '" fill="url(#' + id('grad') + ')"/>' +
        // throwing-ring banding + speckle, clipped to body
        '<g clip-path="url(#' + id('clip') + ')">' +
          fleck +
          '<rect x="' + (cx - topR - 4) + '" y="' + topY + '" width="' + (topR * 2 + 8) + '" height="' + (footY - topY) + '" fill="url(#' + id('sheen') + ')"/>' +
          '<path d="' + bodyPath + '" fill="none" stroke="' + g.dark + '" stroke-width="6" opacity="0.18"/>' +
        '</g>' +
        // mouth opening
        (isOpen
          ? '<ellipse cx="' + cx + '" cy="' + topY + '" rx="' + topR + '" ry="' + rimRy + '" fill="url(#' + id('mouth') + ')"/>' +
            '<ellipse cx="' + cx + '" cy="' + (topY - 1.5) + '" rx="' + topR + '" ry="' + rimRy + '" fill="none" stroke="' + g.light + '" stroke-width="2.4" opacity="0.85"/>'
          : '<ellipse cx="' + cx + '" cy="' + topY + '" rx="' + topR + '" ry="' + Math.max(3, topR * 0.5) + '" fill="' + g.dark + '"/>') +
      '</g>';

    return { defs: defs, group: group, box: { cx: cx, topY: topY, footY: footY, topR: topR } };
  }

  /* Standalone <svg> for one vessel (used by product cards on the site). */
  function vesselSVG(opts) {
    var vg = vesselGroup(opts);
    var w = opts.w || 260, h = opts.h || 300;
    return '<svg viewBox="0 0 260 300" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      (opts.label || 'hand-thrown vessel') + '"><defs>' + vg.defs + '</defs>' + vg.group + '</svg>';
  }

  var API = {
    GLAZES: GLAZES,
    PROFILES: PROFILES,
    vesselGroup: vesselGroup,
    vesselSVG: vesselSVG,
    smooth: smooth,
    silhouette: silhouette,
    rng: rng
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.MittiArt = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
