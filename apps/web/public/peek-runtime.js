(function () {
  "use strict";
  var cfg = (window.__PEEK__ = window.__PEEK__ || {});
  var doc = document, body = doc.body;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $all = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var num = function (v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
  var money = function (n) { n = num(n); return n > 0 ? "$" + n : "Free"; };
  var esc = function (s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\\]]/g, "\\$&"); };

  var CARD = "[data-peek-card],[data-card]";
  var order = {};
  var groupSel = {};
  var uid = 0;

  function idOf(card) {
    if (!card.getAttribute("data-peek-id")) card.setAttribute("data-peek-id", card.getAttribute("data-name") || ("c" + ++uid));
    return card.getAttribute("data-peek-id");
  }
  function cardById(id) { return $('[data-peek-id="' + esc(id) + '"]'); }
  function priceOf(card) { return num(card.getAttribute("data-price")); }
  function isLocked(card) {
    return (card.hasAttribute("data-locked") || card.classList.contains("locked")) &&
      !card.classList.contains("unlocked") && card.getAttribute("data-peek-unlocked") !== "1";
  }
  function budget() { var el = $("[data-budget]"); return el ? num(el.getAttribute("data-budget")) : 0; }
  function total() { var t = 0; for (var k in order) t += order[k].price || 0; return t; }
  function count() { var n = 0; for (var k in order) { void k; n++; } return n; }

  function refresh() {
    var B = budget(), t = total(), n = count();
    var tabBox = $("[data-peek-tab]") || $("#tab");
    var tabAmt = $("[data-peek-tab-amount]") || $("#tabAmt");
    var tabFill = $("[data-peek-tab-fill]") || $("#tabFill");
    var tabMsg = $("[data-peek-tab-msg]") || $("#tabMsg");
    if (B > 0) {
      var left = B - t, over = left < 0;
      if (tabBox) tabBox.classList.toggle("over", over);
      if (tabAmt) tabAmt.textContent = over ? ("$" + Math.abs(left) + " over") : ("$" + left + " left");
      if (tabFill) tabFill.style.width = Math.min(100, (t / B) * 100) + "%";
      if (tabMsg) tabMsg.textContent = over
        ? ("$" + Math.abs(left) + " over — swap or drop a paid pick.")
        : (n === 0 ? "Nothing picked yet." : (n + " picked · $" + t + " of $" + B + "."));
    }
    updateBar(B, t, n);
  }

  function markCard(card, on) {
    if (!card) return;
    card.classList.toggle("chosen-on", on);
    if (on) card.setAttribute("data-peek-picked", "1"); else card.removeAttribute("data-peek-picked");
  }
  function pick(card, on) {
    if (!card) return;
    var id = idOf(card);
    if (on === undefined) on = !order[id];
    var group = card.getAttribute("data-group");
    var pickOne = group && card.getAttribute("data-rule") === "pick-one";
    if (on && pickOne) {
      var prev = groupSel[group];
      if (prev && prev !== id) { delete order[prev]; markCard(cardById(prev), false); }
      groupSel[group] = id;
    }
    if (on) {
      order[id] = {
        price: priceOf(card), name: card.getAttribute("data-name") || id,
        kind: card.getAttribute("data-kind") || "product", src: card.getAttribute("data-src") || "", desc: card.getAttribute("data-desc") || "",
      };
      maybeUnlock(card);
    } else {
      delete order[id];
      if (pickOne && groupSel[group] === id) delete groupSel[group];
    }
    markCard(card, on);
    refresh();
    if (cfg.mode === "recipient") postToHost({ kind: "pick", cardId: id, on: !!on });
  }

  function maybeUnlock(trigger) {
    var token = (trigger.getAttribute("data-kind") || "") + "|" + (trigger.getAttribute("data-group") || "") + "|" + idOf(trigger);
    $all("[data-unlock]").forEach(function (c) {
      var m = /^after:(.+)$/.exec(c.getAttribute("data-unlock") || "");
      if (m && token.indexOf(m[1]) !== -1) { c.classList.add("unlocked"); c.setAttribute("data-peek-unlocked", "1"); }
    });
  }

  doc.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || t.nodeType !== 1) return;
    if (t.closest("[data-close-sheet]")) { closeSheet(); return; }
    var action = t.closest("[data-peek-action]");
    if (action) { e.preventDefault(); doAction(action.getAttribute("data-peek-action") || "publish"); return; }
    var spick = t.closest("[data-peek-sheet-pick],.sh-pick");
    if (spick && sheetEl && sheetEl.contains(spick)) { if (sheetCard) pick(sheetCard); closeSheet(); return; }
    var opt = t.closest("[data-opt]");
    if (opt) {
      var oc = opt.closest(CARD); if (!oc) return;
      e.stopPropagation();
      var was = opt.classList.contains("sel");
      $all("[data-opt]", oc).forEach(function (o) { o.classList.remove("sel"); });
      if (was) pick(oc, false);
      else { opt.classList.add("sel"); oc.setAttribute("data-price", String(num(opt.getAttribute("data-price")))); pick(oc, true); }
      return;
    }
    var card = t.closest(CARD);
    if (card) {
      if (sheetEl && sheetEl.contains(card)) return;
      if ($all("[data-opt]", card).length) return;
      if (isLocked(card)) return;
      openSheet(card);
    }
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  var sheetEl = $("[data-peek-sheet]") || $(".sheet");
  if (!sheetEl) {
    sheetEl = doc.createElement("div");
    sheetEl.setAttribute("data-peek-sheet", "");
    sheetEl.setAttribute("role", "dialog"); sheetEl.setAttribute("aria-modal", "true");
    sheetEl.innerHTML =
      '<div data-close-sheet data-peek-sheet-scrim></div>' +
      '<div data-peek-sheet-panel><div data-peek-sheet-grab></div>' +
      '<div data-peek-sheet-src></div><div data-peek-sheet-name></div>' +
      '<div data-peek-sheet-desc></div><div data-peek-sheet-price></div>' +
      '<div data-peek-sheet-cta><button type="button" data-close-sheet>Close</button>' +
      '<button type="button" data-peek-sheet-pick>Add to my order</button></div></div>';
    var ss = doc.createElement("style");
    ss.textContent =
      "[data-peek-sheet]{position:fixed;inset:0;z-index:9000;visibility:hidden}" +
      "[data-peek-sheet].open{visibility:visible}" +
      "[data-peek-sheet-scrim]{position:absolute;inset:0;background:rgba(0,0,0,.6);opacity:0;transition:opacity .3s}" +
      "[data-peek-sheet].open [data-peek-sheet-scrim]{opacity:1}" +
      "[data-peek-sheet-panel]{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;background:var(--peek-surface,#15131c);color:inherit;border-radius:20px 20px 0 0;padding:10px 22px calc(26px + env(safe-area-inset-bottom,0px));max-height:88vh;overflow:auto;transform:translateY(101%);transition:transform .42s cubic-bezier(.3,.85,.2,1);box-shadow:0 -20px 60px rgba(0,0,0,.5)}" +
      "[data-peek-sheet].open [data-peek-sheet-panel]{transform:none}" +
      "[data-peek-sheet-grab]{width:42px;height:4px;border-radius:99px;background:rgba(128,128,128,.4);margin:6px auto 16px}" +
      "[data-peek-sheet-name]{font-size:24px;font-weight:800;margin-top:8px;line-height:1.1}" +
      "[data-peek-sheet-desc]{opacity:.7;margin-top:10px;font-size:14.5px}" +
      "[data-peek-sheet-price]{font-size:21px;font-weight:800;margin-top:14px}" +
      "[data-peek-sheet-cta]{display:flex;gap:12px;margin-top:22px}" +
      "[data-peek-sheet-cta] button{flex:1;padding:13px;border-radius:999px;border:1px solid rgba(128,128,128,.4);background:var(--peek-accent,#e0556b);color:#fff;font:inherit;font-weight:700;cursor:pointer}" +
      "[data-peek-sheet-cta] [data-close-sheet]{flex:0 0 auto;background:transparent;color:inherit}";
    doc.head.appendChild(ss); body.appendChild(sheetEl);
  }
  var sheetCard = null;
  function sQ(a, b) { return sheetEl ? sheetEl.querySelector(a) || (b ? sheetEl.querySelector(b) : null) : null; }
  function openSheet(card) {
    sheetCard = card;
    var f;
    if ((f = sQ("[data-peek-sheet-src]", ".sh-src"))) f.textContent = card.getAttribute("data-src") || "";
    if ((f = sQ("[data-peek-sheet-name]", ".sh-name"))) f.textContent = card.getAttribute("data-name") || "";
    if ((f = sQ("[data-peek-sheet-desc]", ".sh-desc"))) f.textContent = card.getAttribute("data-desc") || "";
    if ((f = sQ("[data-peek-sheet-price]", ".sh-price"))) f.textContent = money(card.getAttribute("data-price"));
    if ((f = sQ("[data-peek-sheet-pick]", ".sh-pick"))) f.textContent = order[idOf(card)] ? "Remove from order" : "Add to my order";
    sheetEl.classList.add("open"); body.classList.add("sheet-open");
  }
  function closeSheet() { if (sheetEl) sheetEl.classList.remove("open"); body.classList.remove("sheet-open"); }

  var bar = $("[data-peek-bar]") || $(".mbar");
  if (!bar) {
    bar = doc.createElement("div"); bar.setAttribute("data-peek-bar", "");
    bar.innerHTML = '<div data-peek-bar-meta><div data-peek-bar-k></div><div data-peek-bar-v></div></div>' +
      '<button type="button" data-peek-action="' + (cfg.mode === "recipient" ? "claim" : "publish") + '">' +
      (cfg.mode === "recipient" ? "Send my picks" : "Publish · $12") + "</button>";
    var bs = doc.createElement("style");
    bs.textContent = "[data-peek-bar]{position:fixed;left:0;right:0;bottom:0;z-index:8000;display:flex;align-items:center;gap:14px;padding:11px 18px calc(11px + env(safe-area-inset-bottom,0px));background:var(--peek-surface,rgba(15,13,20,.95));backdrop-filter:blur(14px);border-top:1px solid rgba(128,128,128,.3);transform:translateY(160%);transition:transform .4s cubic-bezier(.3,.8,.2,1)}" +
      "[data-peek-bar].show{transform:none}[data-peek-bar-meta]{flex:1;min-width:0}" +
      "[data-peek-bar-k]{font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;font-weight:700}" +
      "[data-peek-bar-v]{font-weight:800;font-size:16px;line-height:1.1}" +
      "[data-peek-bar] button{flex:0 0 auto;padding:12px 18px;border-radius:999px;border:none;background:var(--peek-accent,#e0556b);color:#fff;font:inherit;font-weight:700;cursor:pointer}";
    doc.head.appendChild(bs); body.appendChild(bar);
  }
  function updateBar(B, t, n) {
    var k = bar.querySelector("[data-peek-bar-k]") || bar.querySelector("#mbarK") || bar.querySelector(".k");
    var v = bar.querySelector("[data-peek-bar-v]") || bar.querySelector("#mbarV") || bar.querySelector(".v");
    if (k) k.textContent = B > 0 ? ("$" + Math.max(0, B - t) + " left on the tab") : (n + " in your order");
    if (v) v.textContent = n === 0 ? "Pick your order" : (n + (n === 1 ? " pick" : " picks") + (t > 0 ? " · $" + t : ""));
  }

  function doAction(type) {
    var items = []; for (var k in order) items.push(order[k]);
    var summary = { items: items, total: total(), budget: budget() };
    if (typeof cfg.onAction === "function") cfg.onAction(type, summary);
    else if (cfg.mode === "recipient") postToHost({ kind: "action", type: type, summary: summary });
    else { try { console.log("[peek] action:", type, summary); } catch (e) { void e; } }
  }

  function wireReveals() {
    if ("IntersectionObserver" in window) {
      var rvo = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rvo.unobserve(en.target); } });
      }, { threshold: 0.12 });
      $all(".rv,[data-peek-reveal]").forEach(function (el) { if (!el.classList.contains("in")) rvo.observe(el); });
    } else {
      $all(".rv,[data-peek-reveal]").forEach(function (el) { el.classList.add("in"); });
    }
  }
  cfg.rescan = function () { wireReveals(); refresh(); };

  var anchor = $("#top") || $("header") || $(CARD);
  if ("IntersectionObserver" in window && anchor && bar) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { bar.classList.toggle("show", !en.isIntersecting); });
    }, { rootMargin: "-40% 0px 0px 0px" }).observe(anchor);
  } else if (bar) {
    bar.classList.add("show");
  }

  function postToHost(msg) {
    try {
      if (window.parent && window.parent !== window) {
        var out = { source: "peek", v: 1 };
        for (var k in msg) out[k] = msg[k];
        window.parent.postMessage(out, "*");
      }
    } catch (e) { void e; }
  }
  window.addEventListener("message", function (e) {
    var d = e && e.data;
    if (!d || d.source !== "peek-host" || d.kind !== "sync" || !Array.isArray(d.picks)) return;
    Object.keys(order).forEach(function (id) { markCard(cardById(id), false); delete order[id]; });
    groupSel = {};
    d.picks.forEach(function (id) {
      var c = cardById(id); if (!c) return;
      order[id] = {
        price: priceOf(c), name: c.getAttribute("data-name") || id,
        kind: c.getAttribute("data-kind") || "product", src: c.getAttribute("data-src") || "", desc: c.getAttribute("data-desc") || "",
      };
      markCard(c, true);
      var g = c.getAttribute("data-group");
      if (g && c.getAttribute("data-rule") === "pick-one") groupSel[g] = id;
      maybeUnlock(c);
    });
    refresh();
  });

  wireReveals();
  refresh();
})();
