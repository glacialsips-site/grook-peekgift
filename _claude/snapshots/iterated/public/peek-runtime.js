(function () {
  "use strict";
  var cfg = (window.__PEEK__ = window.__PEEK__ || {});
  var doc = document;
  var qs = function (s, r) { return (r || doc).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var toNumber = function (v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
  var money = function (n) { return n > 0 ? "$" + n : "Free"; };
  var escapeId = function (v) { return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\\]]/g, "\\$&"); };

  var CARD = "[data-peek-card]";
  var order = Object.create(null);
  var groupChoice = Object.create(null);
  var autoId = 0;
  var sheet = null;
  var sheetCard = null;
  var bar = null;

  function cardId(card) {
    var id = card.getAttribute("data-peek-id");
    if (!id) { id = card.getAttribute("data-name") || ("card-" + ++autoId); card.setAttribute("data-peek-id", id); }
    return id;
  }
  function cardById(id) { return qs('[data-peek-id="' + escapeId(id) + '"]'); }
  function priceOf(card) {
    var opt = qs("[data-opt].peek-opt-on", card);
    return toNumber((opt || card).getAttribute("data-price"));
  }
  function locked(card) {
    return card.hasAttribute("data-locked") && card.getAttribute("data-peek-unlocked") !== "1";
  }
  function budgetRegion() { return qs("[data-budget]"); }
  function budget() { var r = budgetRegion(); return r ? toNumber(r.getAttribute("data-budget")) : 0; }
  function orderTotal() { var t = 0; for (var k in order) t += order[k].price; return t; }
  function orderCount() { var n = 0; for (var k in order) { void k; n++; } return n; }

  function setPicked(card, on) {
    if (!card) return;
    if (on) card.setAttribute("data-peek-picked", "1");
    else card.removeAttribute("data-peek-picked");
  }

  function pick(card, on) {
    if (!card || locked(card)) return;
    var id = cardId(card);
    if (on === undefined) on = !order[id];
    var group = card.getAttribute("data-group");
    var pickOne = group && card.getAttribute("data-rule") === "pick-one";
    if (on && pickOne) {
      var prev = groupChoice[group];
      if (prev && prev !== id) { delete order[prev]; setPicked(cardById(prev), false); }
      groupChoice[group] = id;
    }
    if (on) {
      order[id] = {
        price: priceOf(card),
        name: card.getAttribute("data-name") || id,
        kind: card.getAttribute("data-kind") || "product",
        src: card.getAttribute("data-src") || "",
      };
      unlockFrom(card);
    } else {
      delete order[id];
      if (pickOne && groupChoice[group] === id) delete groupChoice[group];
    }
    setPicked(card, on);
    refresh();
  }

  function unlockFrom(card) {
    var token = (card.getAttribute("data-kind") || "") + "|" + (card.getAttribute("data-group") || "") + "|" + cardId(card);
    qsa("[data-locked][data-unlock]").forEach(function (c) {
      var m = /^after:(.+)$/.exec(c.getAttribute("data-unlock") || "");
      if (m && token.indexOf(m[1]) !== -1) c.setAttribute("data-peek-unlocked", "1");
    });
  }

  function chooseOption(opt) {
    var card = opt.closest(CARD);
    if (!card) return;
    var on = !opt.classList.contains("peek-opt-on");
    qsa("[data-opt]", card).forEach(function (o) { o.classList.remove("peek-opt-on"); });
    if (on) { opt.classList.add("peek-opt-on"); pick(card, true); }
    else pick(card, false);
  }

  function setText(scope, s, text) { var el = qs(s, scope); if (el) el.textContent = text; }

  function refresh() {
    var b = budget(), t = orderTotal(), n = orderCount();
    var region = budgetRegion();
    if (region && b > 0) {
      var left = b - t, over = left < 0;
      region.setAttribute("data-peek-over", over ? "1" : "0");
      setText(doc, "[data-peek-tab-amount]", over ? ("$" + Math.abs(left) + " over") : ("$" + left + " left"));
      var fill = qs("[data-peek-tab-fill]");
      if (fill) fill.style.width = Math.max(0, Math.min(100, (t / b) * 100)) + "%";
      setText(doc, "[data-peek-tab-msg]", n === 0 ? "Nothing picked yet." : over ? ("$" + Math.abs(left) + " over the tab.") : (n + " picked · $" + t + " of $" + b + "."));
    }
    if (bar) {
      setText(bar, "[data-peek-bar-amount]", b > 0 ? ("$" + Math.max(0, b - t) + " left") : (n ? ("$" + t) : ""));
      setText(bar, "[data-peek-bar-count]", n === 0 ? "Nothing picked yet" : (n + (n === 1 ? " pick" : " picks")));
    }
  }

  function openSheet(card) {
    if (!sheet) { pick(card); return; }
    sheetCard = card;
    setText(sheet, "[data-peek-sheet-name]", card.getAttribute("data-name") || "");
    setText(sheet, "[data-peek-sheet-src]", card.getAttribute("data-src") || "");
    setText(sheet, "[data-peek-sheet-desc]", card.getAttribute("data-desc") || "");
    setText(sheet, "[data-peek-sheet-price]", money(priceOf(card)));
    var btn = qs("[data-peek-sheet-pick]", sheet);
    if (btn) btn.textContent = order[cardId(card)] ? "Remove" : "Add to your order";
    sheet.setAttribute("data-peek-open", "1");
  }
  function closeSheet() { if (sheet) sheet.removeAttribute("data-peek-open"); }

  function act(type) {
    var items = []; for (var k in order) items.push(order[k]);
    if (typeof cfg.onAction === "function") cfg.onAction({ type: type, mode: cfg.mode || "preview", items: items, total: orderTotal(), budget: budget() });
  }

  doc.addEventListener("click", function (e) {
    var node = e.target;
    if (!node || node.nodeType !== 1) return;
    if (node.closest("[data-peek-sheet-close]")) { closeSheet(); return; }
    var action = node.closest("[data-peek-action]");
    if (action) { e.preventDefault(); act(action.getAttribute("data-peek-action") || "publish"); return; }
    var sheetPick = node.closest("[data-peek-sheet-pick]");
    if (sheetPick && sheet && sheet.contains(sheetPick)) { if (sheetCard) pick(sheetCard); closeSheet(); return; }
    var opt = node.closest("[data-opt]");
    if (opt) { e.stopPropagation(); chooseOption(opt); return; }
    var card = node.closest(CARD);
    if (card && !(sheet && sheet.contains(card)) && !locked(card)) {
      if (qsa("[data-opt]", card).length) return;
      openSheet(card);
    }
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  function wireReveals() {
    var items = qsa("[data-peek-reveal]:not([data-peek-shown])");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) { items.forEach(function (el) { el.setAttribute("data-peek-shown", "1"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.setAttribute("data-peek-shown", "1"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  function wireBar() {
    if (!bar) return;
    var anchor = qs("[data-peek-bar-anchor]") || qs("header") || qs(CARD);
    if ("IntersectionObserver" in window && anchor) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { bar.setAttribute("data-peek-bar-shown", en.isIntersecting ? "0" : "1"); });
      }, { rootMargin: "-40% 0px 0px 0px" }).observe(anchor);
    } else {
      bar.setAttribute("data-peek-bar-shown", "1");
    }
  }

  function scan() { sheet = qs("[data-peek-sheet]"); bar = qs("[data-peek-bar]"); wireReveals(); wireBar(); refresh(); }
  cfg.rescan = scan;
  scan();
})();
