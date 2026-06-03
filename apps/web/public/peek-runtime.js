/* peek-runtime.js — the fixed host layer for peek.gift pages.
 *
 * The chat authors a freeform, tagged HTML page; this layer (identical on every page, injected
 * at render into the preview iframe AND the recipient route) turns the tags into a rules-aware,
 * payable order. The model declares INTENT via data-* ; the host renders the affordance and
 * enforces the rule. Decoration stays in the page's own CSS/SVG — this file owns behavior only.
 *
 * Contract (canonical data-peek-*, with legacy data-card/data-opt aliases so authored examples run):
 *   [data-peek-card] | [data-card]   a claimable item. attrs:
 *       data-kind   product|wrapped|custom|experience|taunt|digital|...
 *       data-name   stable id + label        data-price  number (0/absent = free)
 *       data-src    source/retailer label     data-desc   sheet copy
 *       data-group  pick-one group key        data-rule   pick-one|pick-any
 *       data-locked                           data-unlock after:<kind|group|name>
 *   [data-opt]  a pick-one sub-option inside a card: data-price, data-label
 *   data-budget="250"  on any element = the shared tab pool (the constraint)
 *   [data-peek-tab] / [data-peek-tab-amount|fill|msg]  the model's tab meter the host drives
 *   [data-peek-action="publish|claim|rsvp|share"]  the primary CTA
 * The host sets data-peek-picked (+ legacy .chosen-on) on chosen cards — the model styles that
 * state. window.__PEEK__ = { mode:"preview"|"recipient", onAction(type, order) } before load.
 */
(function () {
  "use strict";
  var cfg = (window.__PEEK__ = window.__PEEK__ || {});
  var doc = document, body = doc.body;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $all = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var num = function (v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
  var money = function (n) { n = num(n); return n > 0 ? "$" + n : "Free"; };

  var cards = $all("[data-peek-card],[data-card]");
  if (!cards.length && !$("[data-peek-action]")) return; // nothing tagged → leave the page as static art

  var budgetEl = $("[data-budget]");
  var BUDGET = budgetEl ? num(budgetEl.getAttribute("data-budget")) : 0;

  var order = {};      // id -> { price, name, kind, src, desc }
  var groupSel = {};   // group -> id (current pick-one selection)
  var cardIndex = cards.slice();

  function idOf(card) { return card.getAttribute("data-name") || card.id || ("card-" + cardIndex.indexOf(card)); }
  function priceOf(card) { return num(card.getAttribute("data-price")); }
  function cardById(id) { for (var i = 0; i < cardIndex.length; i++) if (idOf(cardIndex[i]) === id) return cardIndex[i]; return null; }
  function isLocked(card) {
    return (card.hasAttribute("data-locked") || card.classList.contains("locked")) &&
      !card.classList.contains("unlocked") && card.getAttribute("data-peek-unlocked") !== "1";
  }

  /* ── tab meter (the model authors the visible meter; the host drives the numbers) ── */
  var tabBox = $("[data-peek-tab]") || $("#tab");
  var tabAmt = $("[data-peek-tab-amount]") || $("#tabAmt");
  var tabFill = $("[data-peek-tab-fill]") || $("#tabFill");
  var tabMsg = $("[data-peek-tab-msg]") || $("#tabMsg");

  function total() { var t = 0; for (var k in order) t += order[k].price || 0; return t; }
  function count() { var n = 0; for (var k in order) n++; return n; }

  function refresh() {
    var t = total(), n = count();
    if (BUDGET > 0) {
      var left = BUDGET - t, over = left < 0;
      if (tabBox) tabBox.classList.toggle("over", over);
      if (tabAmt) tabAmt.textContent = over ? ("$" + Math.abs(left) + " over") : ("$" + left + " left");
      if (tabFill) tabFill.style.width = Math.min(100, (t / BUDGET) * 100) + "%";
      if (tabMsg) tabMsg.textContent = over
        ? ("You're $" + Math.abs(left) + " over — swap or drop a paid pick.")
        : (n === 0 ? "Nothing picked yet." : (n + " picked · $" + t + " of $" + BUDGET + "."));
    }
    updateBar();
  }

  /* ── pick / unpick ── */
  function markCard(card, on) {
    if (!card) return;
    card.classList.toggle("chosen-on", on); // alias for authored example CSS
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
        price: priceOf(card), name: id, kind: card.getAttribute("data-kind") || "product",
        src: card.getAttribute("data-src") || "", desc: card.getAttribute("data-desc") || ""
      };
      maybeUnlock(card);
    } else {
      delete order[id];
      if (pickOne && groupSel[group] === id) delete groupSel[group];
    }
    markCard(card, on);
    refresh();
  }

  /* ── unlock: data-unlock="after:<kind|group|name>" opens when a matching card is picked ── */
  function maybeUnlock(trigger) {
    var token = (trigger.getAttribute("data-kind") || "") + "|" + (trigger.getAttribute("data-group") || "") + "|" + idOf(trigger);
    cardIndex.forEach(function (c) {
      var u = c.getAttribute("data-unlock"); if (!u) return;
      var m = /^after:(.+)$/.exec(u); if (!m) return;
      if (token.indexOf(m[1]) !== -1) { c.classList.add("unlocked"); c.setAttribute("data-peek-unlocked", "1"); }
    });
  }

  /* ── pick-one sub-options ([data-opt] inside a card; sub-price overrides card price) ── */
  cardIndex.forEach(function (card) {
    var opts = $all("[data-opt]", card);
    if (!opts.length) return;
    opts.forEach(function (opt) {
      opt.addEventListener("click", function (e) {
        e.stopPropagation();
        var was = opt.classList.contains("sel");
        opts.forEach(function (o) { o.classList.remove("sel"); });
        if (was) { pick(card, false); }
        else { opt.classList.add("sel"); card.setAttribute("data-price", String(num(opt.getAttribute("data-price")))); pick(card, true); }
      });
    });
  });

  /* ── card click → bottom sheet (option cards handle their own taps) ── */
  cardIndex.forEach(function (card) {
    if ($all("[data-opt]", card).length) return;
    card.addEventListener("click", function () { if (!isLocked(card)) openSheet(card); });
  });

  /* ── bottom sheet: use the authored one if present, else inject a themed fallback ── */
  var sheet = $("[data-peek-sheet]") || $(".sheet");
  var sheetField = {}, sheetPickBtn = null, sheetCard = null;
  function injectSheet() {
    var s = doc.createElement("div");
    s.setAttribute("data-peek-sheet", "");
    s.setAttribute("role", "dialog"); s.setAttribute("aria-modal", "true");
    s.innerHTML =
      '<div data-peek-sheet-scrim></div>' +
      '<div data-peek-sheet-panel>' +
      '<div data-peek-sheet-grab></div>' +
      '<div data-peek-sheet-src></div>' +
      '<div data-peek-sheet-name></div>' +
      '<div data-peek-sheet-desc></div>' +
      '<div data-peek-sheet-price></div>' +
      '<div data-peek-sheet-cta><button type="button" data-close-sheet>Close</button>' +
      '<button type="button" data-peek-sheet-pick>Add to my order</button></div></div>';
    var st = doc.createElement("style");
    st.textContent =
      "[data-peek-sheet]{position:fixed;inset:0;z-index:9000;visibility:hidden}" +
      "[data-peek-sheet].open{visibility:visible}" +
      "[data-peek-sheet] [data-peek-sheet-scrim]{position:absolute;inset:0;background:rgba(0,0,0,.6);opacity:0;transition:opacity .3s}" +
      "[data-peek-sheet].open [data-peek-sheet-scrim]{opacity:1}" +
      "[data-peek-sheet] [data-peek-sheet-panel]{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;" +
      "background:var(--peek-surface,#15131c);color:inherit;border-radius:20px 20px 0 0;padding:10px 22px calc(26px + env(safe-area-inset-bottom,0px));" +
      "max-height:88vh;overflow:auto;transform:translateY(101%);transition:transform .42s cubic-bezier(.3,.85,.2,1);box-shadow:0 -20px 60px rgba(0,0,0,.5)}" +
      "[data-peek-sheet].open [data-peek-sheet-panel]{transform:none}" +
      "[data-peek-sheet-grab]{width:42px;height:4px;border-radius:99px;background:rgba(128,128,128,.4);margin:6px auto 16px}" +
      "[data-peek-sheet-name]{font-size:24px;font-weight:800;margin-top:8px;line-height:1.1}" +
      "[data-peek-sheet-desc]{opacity:.7;margin-top:10px;font-size:14.5px}" +
      "[data-peek-sheet-price]{font-size:21px;font-weight:800;margin-top:14px}" +
      "[data-peek-sheet-cta]{display:flex;gap:12px;margin-top:22px}[data-peek-sheet-cta] button{flex:1;padding:13px;border-radius:999px;border:1px solid rgba(128,128,128,.4);background:var(--peek-accent,#e0556b);color:#fff;font:inherit;font-weight:700;cursor:pointer}[data-peek-sheet-cta] [data-close-sheet]{flex:0 0 auto;background:transparent;color:inherit}";
    doc.head.appendChild(st); body.appendChild(s);
    return s;
  }
  if (!sheet) sheet = injectSheet();
  if (sheet) {
    var pick$ = function (a, b) { return sheet.querySelector(a) || sheet.querySelector(b); };
    sheetField = {
      src: pick$("[data-peek-sheet-src]", ".sh-src"),
      name: pick$("[data-peek-sheet-name]", ".sh-name"),
      desc: pick$("[data-peek-sheet-desc]", ".sh-desc"),
      price: pick$("[data-peek-sheet-price]", ".sh-price"),
    };
    sheetPickBtn = pick$("[data-peek-sheet-pick]", ".sh-pick");
    $all("[data-close-sheet]", sheet).forEach(function (el) { el.addEventListener("click", closeSheet); });
    if (sheetPickBtn) sheetPickBtn.addEventListener("click", function () { if (sheetCard) pick(sheetCard); closeSheet(); });
  }
  function openSheet(card) {
    sheetCard = card;
    if (sheetField.src) sheetField.src.textContent = card.getAttribute("data-src") || "";
    if (sheetField.name) sheetField.name.textContent = card.getAttribute("data-name") || "";
    if (sheetField.desc) sheetField.desc.textContent = card.getAttribute("data-desc") || "";
    if (sheetField.price) sheetField.price.textContent = money(card.getAttribute("data-price"));
    if (sheetPickBtn) sheetPickBtn.textContent = order[idOf(card)] ? "Remove from order" : "Add to my order";
    sheet.classList.add("open"); body.classList.add("sheet-open");
  }
  function closeSheet() { if (sheet) sheet.classList.remove("open"); body.classList.remove("sheet-open"); }
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ── sticky order bar: authored if present, else injected ── */
  var bar = $("[data-peek-bar]") || $(".mbar"), barK = null, barV = null;
  if (!bar) {
    bar = doc.createElement("div"); bar.setAttribute("data-peek-bar", "");
    bar.innerHTML = '<div data-peek-bar-meta><div data-peek-bar-k></div><div data-peek-bar-v></div></div>' +
      '<button type="button" data-peek-action="' + (cfg.mode === "recipient" ? "claim" : "publish") + '">' +
      (cfg.mode === "recipient" ? "Send my picks" : "Publish · $12") + "</button>";
    var bst = doc.createElement("style");
    bst.textContent = "[data-peek-bar]{position:fixed;left:0;right:0;bottom:0;z-index:8000;display:flex;align-items:center;gap:14px;" +
      "padding:11px 18px calc(11px + env(safe-area-inset-bottom,0px));background:var(--peek-surface,rgba(15,13,20,.95));" +
      "backdrop-filter:blur(14px);border-top:1px solid rgba(128,128,128,.3);transform:translateY(160%);transition:transform .4s cubic-bezier(.3,.8,.2,1)}" +
      "[data-peek-bar].show{transform:none}[data-peek-bar] [data-peek-bar-meta]{flex:1;min-width:0}" +
      "[data-peek-bar-k]{font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;font-weight:700}" +
      "[data-peek-bar-v]{font-weight:800;font-size:16px;line-height:1.1}" +
      "[data-peek-bar] button{flex:0 0 auto;padding:12px 18px;border-radius:999px;border:none;background:var(--peek-accent,#e0556b);color:#fff;font:inherit;font-weight:700;cursor:pointer}";
    doc.head.appendChild(bst); body.appendChild(bar);
  }
  barK = bar.querySelector("[data-peek-bar-k]") || bar.querySelector("#mbarK") || bar.querySelector(".k");
  barV = bar.querySelector("[data-peek-bar-v]") || bar.querySelector("#mbarV") || bar.querySelector(".v");
  function updateBar() {
    var n = count(), t = total();
    if (barK) barK.textContent = BUDGET > 0 ? ("$" + Math.max(0, BUDGET - t) + " left on the tab") : (n + " in your order");
    if (barV) barV.textContent = n === 0 ? "Pick your order" : (n + (n === 1 ? " pick" : " picks") + (t > 0 ? " · $" + t : ""));
  }

  /* ── primary action(s): publish / claim / rsvp / share ── */
  function orderSummary() {
    var items = []; for (var k in order) items.push(order[k]);
    return { items: items, total: total(), budget: BUDGET };
  }
  $all("[data-peek-action]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var type = el.getAttribute("data-peek-action") || "publish";
      if (typeof cfg.onAction === "function") cfg.onAction(type, orderSummary());
      else if (cfg.mode !== "recipient") console.log("[peek] action:", type, orderSummary());
    });
  });

  /* ── reveals + sticky-bar visibility ── */
  if ("IntersectionObserver" in window) {
    var rvo = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rvo.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $all(".rv,[data-peek-reveal]").forEach(function (el) { rvo.observe(el); });
    var anchor = $("#top") || $("header") || cardIndex[0];
    if (anchor && bar) new IntersectionObserver(function (es) {
      es.forEach(function (en) { bar.classList.toggle("show", !en.isIntersecting); });
    }, { rootMargin: "-40% 0px 0px 0px" }).observe(anchor);
    else if (bar) bar.classList.add("show");
  } else {
    $all(".rv,[data-peek-reveal]").forEach(function (el) { el.classList.add("in"); });
    if (bar) bar.classList.add("show");
  }

  refresh();
})();
