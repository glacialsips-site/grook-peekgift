/* Mitti storefront — vanilla JS. Mocks Clerk auth + Stripe checkout. */
(function () {
  'use strict';
  var Art = window.MittiArt, Cat = window.MittiCatalog;
  var PRODUCTS = Cat.PRODUCTS, GLAZES = Art.GLAZES, money = Cat.money;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var byId = function (id) { return document.getElementById(id); };

  var state = { cart: [], view: 'home', col: 'All', product: null, glaze: null, qty: 1 };
  var uidc = 0;
  function uid() { return 'u' + (uidc++); }

  function vessel(p, glazeKey, w, h) {
    return Art.vesselSVG({ type: p.type, glaze: glazeKey || p.glaze, seed: p.seed, uid: uid(), w: w, h: h, label: p.name });
  }
  function glazeDots(p) {
    return p.glazes.map(function (g) {
      return '<span class="swatch" style="background:' + GLAZES[g].base + '"></span>';
    }).join('');
  }

  /* ---------------- navigation ---------------- */
  function setView(v) {
    state.view = v;
    document.body.setAttribute('data-view', v);
    document.querySelectorAll('.navlink').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === 'shop' && v === 'shop' && a.dataset.col === state.col);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------- product card ---------------- */
  function renderCard(p) {
    var el = document.createElement('article');
    el.className = 'card';
    el.dataset.id = p.id;
    el.innerHTML =
      '<div class="ph">' +
        (p.tag ? '<span class="tag ' + (p.tag === 'New' ? 'new' : '') + '">' + p.tag + '</span>' : '') +
        vessel(p, p.glaze, 200, 230) +
        '<span class="quick">Quick view</span>' +
      '</div>' +
      '<div class="body">' +
        '<div class="col">' + p.collection + '</div>' +
        '<div class="nm">' + p.name + '</div>' +
        '<div class="sub">' + p.sub + '</div>' +
        '<div class="row">' +
          '<div class="price">' + money(p.price) + '</div>' +
          '<div class="swatch-row">' + glazeDots(p) + '</div>' +
        '</div>' +
      '</div>';
    el.addEventListener('click', function () { openProduct(p.id); });
    return el;
  }

  function renderGrid(container, list) {
    container.innerHTML = '';
    list.forEach(function (p) { container.appendChild(renderCard(p)); });
  }

  /* ---------------- home ---------------- */
  function renderHome() {
    // hero vessels
    var hv = byId('heroVessels');
    var picks = ['surahi', 'marigold-bowl', 'jaipur-vase'].map(function (id) {
      return PRODUCTS.filter(function (p) { return p.id === id; })[0];
    });
    hv.innerHTML =
      '<div class="hv back">' + vessel(picks[0], picks[0].glaze, 150, 200) + '</div>' +
      '<div class="hv mid">' + vessel(picks[1], picks[1].glaze, 200, 230) + '</div>' +
      '<div class="hv front">' + vessel(picks[2], picks[2].glaze, 150, 200) + '</div>';

    renderGrid(byId('homeGrid'), PRODUCTS.slice(0, 6));

    // glaze strip
    var keys = ['terracotta', 'jaipur', 'marigold', 'neem', 'longpi', 'saffron', 'celadon', 'plum'];
    byId('glazeStrip').innerHTML = keys.map(function (k) {
      var g = GLAZES[k];
      return '<div class="glaze-chip"><div class="blob" style="background:radial-gradient(circle at 36% 30%,' +
        g.light + ',' + g.base + ' 58%,' + g.dark + ')"></div><span>' + g.name + '</span></div>';
    }).join('');
  }

  /* ---------------- shop ---------------- */
  function renderFilters() {
    var f = byId('filters');
    f.innerHTML = Cat.COLLECTIONS.map(function (c) {
      return '<button class="chip' + (c === state.col ? ' active' : '') + '" data-col="' + c + '">' + c + '</button>';
    }).join('') + '<span class="res"></span>';
    f.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () { state.col = b.dataset.col; renderShop(); });
    });
  }
  function renderShop() {
    renderFilters();
    var list = state.col === 'All' ? PRODUCTS : PRODUCTS.filter(function (p) { return p.collection === state.col; });
    renderGrid(byId('shopGrid'), list);
    $('.res', byId('filters')).textContent = list.length + ' pieces';
  }

  /* ---------------- product detail ---------------- */
  function openProduct(id) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    state.product = p; state.glaze = p.glaze; state.qty = 1;
    renderProduct();
    setView('product');
  }

  function renderProduct() {
    var p = state.product, gk = state.glaze;
    var stars = '★★★★★';
    var html =
      '<div class="pd-gallery">' +
        '<div class="pd-stage" id="pdStage">' + vessel(p, gk, 360, 415) + '</div>' +
        '<div class="pd-thumbs" id="pdThumbs">' +
          p.glazes.map(function (g, i) {
            return '<div class="pd-thumb' + (g === gk ? ' active' : '') + '" data-g="' + g + '">' + vessel(p, g, 60, 70) + '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="pd-info">' +
        '<div class="rating"><span class="stars">' + stars + '</span> 4.9 · 212 reviews</div>' +
        '<div class="col">' + p.collection + '</div>' +
        '<h1>' + p.name + '</h1>' +
        '<div class="price">' + money(p.price) + '</div>' +
        '<p class="blurb">' + p.blurb + '</p>' +
        '<div class="opt-label">Glaze <span id="glazeName">' + GLAZES[gk].name + '</span></div>' +
        '<div class="glaze-opts" id="glazeOpts">' +
          p.glazes.map(function (g) {
            var gg = GLAZES[g];
            return '<div class="glaze-opt' + (g === gk ? ' active' : '') + '" data-g="' + g + '">' +
              '<div class="dot" style="background:radial-gradient(circle at 36% 30%,' + gg.light + ',' + gg.base + ' 58%,' + gg.dark + ')"></div>' +
              '<small>' + gg.name + '</small></div>';
          }).join('') +
        '</div>' +
        '<div class="qty-row">' +
          '<div class="stepper"><button data-d="-1">−</button><div class="v" id="qtyV">1</div><button data-d="1">+</button></div>' +
          '<button class="btn btn-primary" id="addBtn" style="flex:1;justify-content:center">Add to cart · ' + money(p.price) + '</button>' +
        '</div>' +
        '<div class="made"><span class="dot"></span> Made to order — ships in about 2 weeks</div>' +
        '<div class="details"><h4>The details</h4><ul>' +
          p.details.map(function (d) { return '<li>' + d + '</li>'; }).join('') +
        '</ul></div>' +
      '</div>';
    byId('pdBody').innerHTML = html;

    // glaze switching
    function pick(g) {
      state.glaze = g;
      byId('pdStage').innerHTML = vessel(p, g, 360, 415);
      byId('glazeName').textContent = GLAZES[g].name;
      byId('pdThumbs').querySelectorAll('.pd-thumb').forEach(function (t) { t.classList.toggle('active', t.dataset.g === g); });
      byId('glazeOpts').querySelectorAll('.glaze-opt').forEach(function (t) { t.classList.toggle('active', t.dataset.g === g); });
    }
    byId('glazeOpts').querySelectorAll('.glaze-opt').forEach(function (o) { o.addEventListener('click', function () { pick(o.dataset.g); }); });
    byId('pdThumbs').querySelectorAll('.pd-thumb').forEach(function (o) { o.addEventListener('click', function () { pick(o.dataset.g); }); });

    byId('pdBody').querySelectorAll('.stepper button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.qty = Math.max(1, state.qty + parseInt(b.dataset.d, 10));
        byId('qtyV').textContent = state.qty;
      });
    });
    byId('addBtn').addEventListener('click', function () {
      addToCart(p, state.glaze, state.qty);
    });
  }

  /* ---------------- cart ---------------- */
  function addToCart(p, glazeKey, qty) {
    var existing = state.cart.filter(function (l) { return l.id === p.id && l.glaze === glazeKey; })[0];
    if (existing) existing.qty += qty; else state.cart.push({ id: p.id, glaze: glazeKey, qty: qty });
    renderCart();
    bump();
    toast(p.name + ' added to cart');
    openDrawer();
  }
  function lineProduct(l) { return PRODUCTS.filter(function (p) { return p.id === l.id; })[0]; }
  function subtotal() {
    return state.cart.reduce(function (s, l) { return s + lineProduct(l).price * l.qty; }, 0);
  }
  function cartCount() { return state.cart.reduce(function (s, l) { return s + l.qty; }, 0); }
  function bump() {
    var c = byId('cartCount'); c.textContent = cartCount();
    c.animate ? c.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,1.4,.4,1)' }) : 0;
  }

  function renderCart() {
    var items = byId('cartItems'), foot = byId('cartFooter');
    byId('cartCount').textContent = cartCount();
    if (!state.cart.length) {
      items.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><p style="font-size:13px">Every piece is thrown to order — go pick a glaze.</p></div>';
      foot.innerHTML = '<button class="btn btn-ghost block" id="shopMore">Browse the collection</button>';
      byId('shopMore').addEventListener('click', function () { closeDrawer(); state.col = 'All'; renderShop(); setView('shop'); });
      return;
    }
    items.innerHTML = state.cart.map(function (l, i) {
      var p = lineProduct(l), g = GLAZES[l.glaze];
      return '<div class="line" data-i="' + i + '">' +
        '<div class="thumb">' + vessel(p, l.glaze, 46, 54) + '</div>' +
        '<div><div class="nm">' + p.name + '</div>' +
          '<div class="meta">' + g.name + ' glaze</div>' +
          '<div class="lqty"><button data-d="-1">−</button>' + l.qty + '<button data-d="1">+</button></div>' +
          '<div class="rm" data-rm="1">Remove</div></div>' +
        '<div class="lp">' + money(p.price * l.qty) + '</div>' +
      '</div>';
    }).join('');
    items.querySelectorAll('.line').forEach(function (row) {
      var i = +row.dataset.i;
      row.querySelectorAll('.lqty button').forEach(function (b) {
        b.addEventListener('click', function () {
          state.cart[i].qty = Math.max(1, state.cart[i].qty + parseInt(b.dataset.d, 10));
          renderCart();
        });
      });
      row.querySelector('[data-rm]').addEventListener('click', function () {
        state.cart.splice(i, 1); renderCart();
      });
    });
    var sub = subtotal();
    var ship = sub >= 7500 ? 0 : 900;
    foot.innerHTML =
      '<div class="sub-row"><span>Subtotal</span><span>' + money(sub) + '</span></div>' +
      '<div class="sub-row"><span>Shipping</span><span>' + (ship === 0 ? 'Free' : money(ship)) + '</span></div>' +
      '<div class="sub-row total"><span>Total</span><span>' + money(sub + ship) + '</span></div>' +
      (ship === 0 ? '<div class="ship-note">✓ You\'ve unlocked free kiln-safe shipping.</div>'
                  : '<div class="ship-note">Add ' + money(7500 - sub) + ' more for free shipping.</div>') +
      '<button class="btn btn-dark block" id="goCheckout">Checkout · ' + money(sub + ship) + '</button>' +
      '<div class="secure-row" style="margin-top:12px">' + lockIcon() + ' Secured by <b style="color:#635bff">Stripe</b></div>';
    byId('goCheckout').addEventListener('click', function () { closeDrawer(); openCheckout(); });
  }

  function openDrawer() { byId('drawer').classList.add('open'); byId('scrim').classList.add('open'); }
  function closeDrawer() { byId('drawer').classList.remove('open'); byId('scrim').classList.remove('open'); }

  /* ---------------- checkout ---------------- */
  function lockIcon() { return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'; }

  function orderSummaryHTML() {
    var sub = subtotal(), ship = sub >= 7500 ? 0 : 900, tax = Math.round(sub * 0.06625);
    var lines = state.cart.map(function (l) {
      var p = lineProduct(l), g = GLAZES[l.glaze];
      return '<div class="sum-line"><div class="thumb">' + vessel(p, l.glaze, 40, 46) + '<span class="q">' + l.qty + '</span></div>' +
        '<div><div class="nm">' + p.name + '</div><div class="meta">' + g.name + '</div></div>' +
        '<div class="p">' + money(p.price * l.qty) + '</div></div>';
    }).join('');
    return '<div class="summary"><h3>Order summary</h3>' + lines +
      '<div class="sum-tot">' +
        '<div class="r"><span>Subtotal</span><span>' + money(sub) + '</span></div>' +
        '<div class="r"><span>Shipping</span><span>' + (ship ? money(ship) : 'Free') + '</span></div>' +
        '<div class="r"><span>NJ tax (6.625%)</span><span>' + money(tax) + '</span></div>' +
        '<div class="r big"><span>Total</span><span>' + money(sub + ship + tax) + '</span></div>' +
      '</div>' +
      '<button class="btn btn-primary block pay-now" id="payBtn">' + lockIcon() + ' Pay ' + money(sub + ship + tax) + '</button>' +
      '<div class="secure-row">' + lockIcon() + ' Payments secured by <b style="color:#635bff">Stripe</b> · PCI-DSS</div>' +
    '</div>';
  }

  function openCheckout() {
    if (!state.cart.length) return;
    var body = byId('checkoutBody');
    body.innerHTML =
      '<div class="co-form">' +
        '<a class="back" href="#" id="coBack">← Back</a>' +
        '<div class="co-steps"><b>Cart</b><span>›</span><b>Information</b><span>›</span><span style="color:var(--ink-faint)">Done</span></div>' +
        '<div class="clerk-banner">' +
          '<span class="avatar">AK</span>' +
          '<div class="t"><b>Ananya Kapoor</b><div>ananya@example.com</div></div>' +
          '<div class="clerk-tag"><span class="d"></span> Signed in · Clerk</div>' +
        '</div>' +
        '<div class="co-block"><h3><span class="num">1</span> Shipping address</h3>' +
          '<div class="field"><label>Full name</label><input value="Ananya Kapoor"/></div>' +
          '<div class="field"><label>Address</label><input value="48 Raritan Avenue"/></div>' +
          '<div class="field-row three"><div class="field"><label>City</label><input value="Highland Park"/></div>' +
            '<div class="field"><label>State</label><input value="NJ"/></div>' +
            '<div class="field"><label>ZIP</label><input value="08904"/></div></div>' +
        '</div>' +
        '<div class="co-block"><h3><span class="num">2</span> Payment</h3>' +
          '<div class="stripe-el">' +
            '<div class="stripe-tabs"><div class="stripe-tab active">Card</div><div class="stripe-tab">Apple&nbsp;Pay</div><div class="stripe-tab">Klarna</div></div>' +
            '<div class="stripe-body">' +
              '<div class="field"><label>Card number</label>' +
                '<div class="card-input"><input id="ccNum" value="4242 4242 4242 4242" inputmode="numeric"/>' +
                  '<div class="card-brands">' +
                    '<span class="brandchip" style="background:#1a1f71">VISA</span>' +
                    '<span class="brandchip" style="background:#eb001b">●●</span>' +
                  '</div></div></div>' +
              '<div class="field-row"><div class="field"><label>Expiry</label><input value="04 / 28"/></div>' +
                '<div class="field"><label>CVC</label><input value="314"/></div></div>' +
            '</div>' +
            '<div class="stripe-foot">' + lockIcon() + ' Powered by <b>stripe</b></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      orderSummaryHTML();

    byId('coBack').addEventListener('click', function (e) { e.preventDefault(); setView('shop'); renderShop(); openDrawer(); });
    byId('payBtn').addEventListener('click', payNow);
    setView('checkout');
  }

  function payNow() {
    var btn = byId('payBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Processing with Stripe…';
    setTimeout(function () {
      btn.innerHTML = '<span class="spin"></span> Confirming payment…';
    }, 950);
    setTimeout(function () { completeOrder(); }, 2100);
  }

  /* ---------------- confirmation ---------------- */
  function orderNo() {
    var n = '';
    for (var i = 0; i < 6; i++) n += '0123456789'.charAt(Math.floor(Math.random() * 10));
    return 'MITTI-' + n;
  }
  function completeOrder() {
    var sub = subtotal(), ship = sub >= 7500 ? 0 : 900, tax = Math.round(sub * 0.06625);
    var total = sub + ship + tax;
    var on = orderNo();
    var lines = state.cart.map(function (l) {
      var p = lineProduct(l), g = GLAZES[l.glaze];
      return '<div class="sum-line" style="border-color:var(--line-2)"><div class="thumb">' + vessel(p, l.glaze, 40, 46) + '<span class="q">' + l.qty + '</span></div>' +
        '<div><div class="nm">' + p.name + '</div><div class="meta">' + g.name + ' glaze</div></div>' +
        '<div class="p">' + money(p.price * l.qty) + '</div></div>';
    }).join('');
    byId('doneBody').innerHTML =
      '<div class="check"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 13 4 4 10-11"/></svg></div>' +
      '<h1>Off to the kiln-room.</h1>' +
      '<div class="ord">Order ' + on + '</div>' +
      '<p>Payment confirmed. Your pieces are being thrown, glazed and fired by hand — then wrapped in newsprint and sent your way in about two weeks.</p>' +
      '<div class="done-card">' +
        '<div class="dh"><span>' + on + '</span><span>Paid ' + money(total) + ' · Visa ••4242</span></div>' +
        lines +
        '<div class="sum-tot" style="margin-top:8px"><div class="r big" style="margin-top:0"><span>Total</span><span>' + money(total) + '</span></div></div>' +
      '</div>' +
      '<div class="email-note">✉️ A receipt is on its way to ananya@example.com via Resend</div>' +
      '<div style="margin-top:26px"><button class="btn btn-primary" id="doneShop">Continue shopping</button></div>';
    state.cart = [];
    renderCart();
    byId('doneShop').addEventListener('click', function () { state.col = 'All'; renderShop(); setView('home'); renderHome(); });
    setView('done');
  }

  /* ---------------- toast ---------------- */
  var toastT;
  function toast(msg) {
    var t = byId('toast');
    t.innerHTML = '<span class="av">✓</span> ' + msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) {
        e.preventDefault();
        var v = nav.dataset.nav;
        if (v === 'shop') { state.col = nav.dataset.col || 'All'; renderShop(); }
        if (v === 'home') renderHome();
        setView(v);
      }
    });
    byId('openCart').addEventListener('click', openDrawer);
    byId('closeCart').addEventListener('click', closeDrawer);
    byId('scrim').addEventListener('click', closeDrawer);
  }

  // expose a tiny hook for the demo film / automated walkthrough
  window.Mitti = {
    state: state, setView: setView, openProduct: openProduct,
    addToCart: addToCart, openDrawer: openDrawer, closeDrawer: closeDrawer,
    openCheckout: openCheckout, payNow: payNow
  };

  /* init */
  renderHome();
  renderCart();
  wire();
})();
