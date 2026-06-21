/* Mitti demo film — scene definitions. Each render(t), t in [0,1]. */
const K = require('./kit.js');
const { W, H, C, SERIF, SANS, DEVA, Cat, Art } = K;
const { rrect, txt, vessel, glazeBlob, cursor, wordmark, lock, mail, seg, lerp, clamp, easeOut, easeInOut, easeOutBack, mixHex } = K;

const P = {};
Cat.PRODUCTS.forEach(p => P[p.id] = p);

/* shared storefront top chrome for the UI scenes */
function chrome(cartCount, activeNav, opacity = 1) {
  const navItems = ['Shop', 'Chai & Coffee', 'Table', 'Our Studio'];
  let nav = '', nx = 470;
  navItems.forEach((n) => {
    const w = n.length * 13.2 + 12;
    const act = n === activeNav;
    nav += txt(nx, 116, n, { size: 25, weight: act ? 600 : 500, fill: act ? C.ink : C.inkSoft });
    if (act) nav += rrect(nx, 126, n.length * 12.5, 3, 2, C.clay);
    nx += w + 28;
  });
  return `<g opacity="${opacity}">` +
    rrect(0, 0, W, 44, 0, C.ink) +
    txt(W / 2, 29, 'SMALL-BATCH STUDIO  ·  FREE KILN-SAFE SHIPPING OVER $75  ·  MADE TO ORDER IN NEW JERSEY',
      { size: 16, fill: '#e9d9c0', anchor: 'middle', spacing: 2, weight: 500 }) +
    rrect(0, 44, W, 92, 0, 'rgba(247,239,225,0.96)') +
    rrect(0, 135, W, 1.5, 0, C.line) +
    // brand
    txt(120, 108, 'मिट्टी', { family: DEVA, weight: 600, size: 30, fill: C.clay }) +
    txt(186, 108, 'mitti', { family: SERIF, weight: 600, size: 34, fill: C.ink, spacing: 1 }) +
    nav +
    // user chip (Clerk)
    rrect(W - 470, 70, 150, 44, 22, C.card, `stroke="${C.line}"`) +
    `<circle cx="${W - 446}" cy="92" r="15" fill="url(#avg)"/>` +
    txt(W - 446, 99, 'AK', { size: 15, weight: 700, fill: '#fff', anchor: 'middle' }) +
    txt(W - 420, 99, 'Ananya', { size: 18, weight: 600 }) +
    `<circle cx="${W - 338}" cy="92" r="5" fill="${C.neem}"/>` +
    // cart button
    rrect(W - 300, 68, 180, 48, 24, C.ink) +
    txt(W - 250, 98, 'Cart', { size: 19, weight: 600, fill: '#f7eedd' }) +
    `<circle cx="${W - 160}" cy="92" r="16" fill="${C.marigold}"/>` +
    txt(W - 160, 99, String(cartCount), { size: 17, weight: 700, fill: '#231a10', anchor: 'middle' }) +
    `<defs><linearGradient id="avg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bf6238"/><stop offset="1" stop-color="#8a3f22"/></linearGradient></defs>` +
    `</g>`;
}

/* product card */
function card(x, y, w, p, reveal = 1, lift = 0) {
  const h = 430, phH = 300;
  const sh = reveal * (1);
  return `<g transform="translate(${x},${y - lift})" opacity="${clamp(reveal * 1.4)}" ` +
    `style="filter:drop-shadow(0 ${18 + lift}px ${34 + lift}px rgba(60,38,18,${0.12 + lift * 0.01}))">` +
    rrect(0, 0, w, h, 18, C.card, `stroke="${C.line}"`) +
    rrect(0, 0, w, phH, 18, 'url(#stageG)') +
    rrect(0, phH - 20, w, 20, 0, 'url(#stageG)') +
    (p.tag ? rrect(18, 18, p.tag.length * 11 + 28, 30, 15, p.tag === 'New' ? C.jaipur : C.ink) +
      txt(32, 38, p.tag.toUpperCase(), { size: 13, weight: 600, fill: '#f7eedd', spacing: 1 }) : '') +
    vessel(p, p.glaze, w / 2, phH - 36, 0.78) +
    txt(26, phH + 42, p.collection.toUpperCase(), { size: 13, weight: 600, fill: C.inkFaint, spacing: 1.5 }) +
    txt(26, phH + 78, p.name, { family: SERIF, size: 27, weight: 600 }) +
    txt(26, phH + 108, p.sub, { size: 17, fill: C.inkSoft }) +
    txt(26, h - 26, Cat.money(p.price), { family: SERIF, size: 25, weight: 600 }) +
    p.glazes.map((g, i) => `<circle cx="${w - 28 - i * 22}" cy="${h - 33}" r="9" fill="${Art.GLAZES[g].base}" stroke="#fff" stroke-width="1.5"/>`).join('') +
    `</g>`;
}

const SCENES = [
  /* 1 — TITLE -------------------------------------------------------- */
  {
    name: 'title', min: 6.5, voLead: 0.5,
    vo: 'This is Mitti. Stoneware, thrown one piece at a time. From earth, to wheel, to your table.',
    render(t) {
      const rise = seg(t, 0.05, 0.5, easeOut);
      const potY = lerp(H + 120, 760, rise);
      const potScale = lerp(1.05, 1.35, rise);
      const wmA = seg(t, 0.42, 0.7);
      const tagA = seg(t, 0.58, 0.82);
      const eyeA = seg(t, 0.2, 0.45);
      let s = '';
      // soft ground shadow
      s += `<ellipse cx="${W / 2}" cy="772" rx="${lerp(120, 240, rise)}" ry="34" fill="#3a2410" opacity="${0.16 * rise}"/>`;
      s += vessel('surahi', 'rust', W / 2, potY, potScale, { seed: 23 });
      s += txt(W / 2, 250, 'A SMALL-BATCH POTTERY STUDIO', { size: 22, anchor: 'middle', spacing: 6, fill: C.clayDeep, weight: 600, opacity: eyeA });
      s += `<g opacity="${wmA}" transform="translate(0,${lerp(20, 0, wmA)})">` + wordmark(W / 2, 360, 1.25, 1) + `</g>`;
      s += txt(W / 2, 900, 'Handmade stoneware — wheel-thrown, glazed by hand.', { family: SERIF, italic: true, size: 34, anchor: 'middle', fill: C.inkSoft, opacity: tagA });
      return s;
    }
  },

  /* 2 — GLAZE KITCHEN ------------------------------------------------ */
  {
    name: 'glazes', min: 6.8, voLead: 0.35,
    vo: 'Every glaze is mixed by hand, in small batches. Jaipur blue. Marigold. River-stone grey.',
    render(t) {
      const keys = ['terracotta', 'jaipur', 'marigold', 'neem', 'longpi', 'saffron', 'celadon', 'plum'];
      let s = txt(W / 2, 150, 'THE GLAZE KITCHEN', { size: 22, anchor: 'middle', spacing: 6, fill: C.clayDeep, weight: 600, opacity: seg(t, 0, 0.2) });
      s += txt(W / 2, 232, 'Mixed by hand', { family: SERIF, size: 64, weight: 600, anchor: 'middle', opacity: seg(t, 0.05, 0.3) });
      // blobs animate in, staggered
      const cols = keys.length, gap = W / (cols + 1);
      keys.forEach((k, i) => {
        const a = seg(t, 0.18 + i * 0.05, 0.5 + i * 0.05, easeOutBack);
        const x = gap * (i + 1), y = 470, r = 72 * a;
        if (r > 1) {
          s += glazeBlob(x, y, r, k, clamp(a));
          s += txt(x, 600, Art.GLAZES[k].name, { size: 20, anchor: 'middle', fill: C.inkSoft, weight: 500, opacity: a });
        }
      });
      // three vessels glide in below
      const trio = [['kulhad', 'terracotta', 11], ['marigold-bowl', 'marigold', 31], ['jaipur-vase', 'jaipur', 41]];
      trio.forEach((v, i) => {
        const a = seg(t, 0.5 + i * 0.08, 0.8 + i * 0.08, easeOut);
        const x = W / 2 + (i - 1) * 360;
        const y = lerp(1180, 1000, a);
        const prod = P[v[0]] || { type: v[0], seed: v[2] };
        s += vessel(prod.type, v[1], x, y, 0.74, { seed: v[2], opacity: a });
      });
      return s;
    }
  },

  /* 3 — SHOP GRID ---------------------------------------------------- */
  {
    name: 'shop', min: 8, voLead: 0.3,
    vo: 'Browse the collection. Kulhads for your morning chai. A surahi that sweats cool in the summer heat.',
    render(t) {
      const ids = ['kulhad-set', 'surahi', 'indigo-planter', 'marigold-bowl', 'longpi-tumbler', 'haldi-mug'];
      const slide = seg(t, 0.05, 0.4, easeOut);
      let s = '';
      s += txt(120, 250, 'The collection', { family: SERIF, size: 56, weight: 600, opacity: seg(t, 0.02, 0.2) });
      s += txt(120, 300, 'Everything is thrown to order — choose a glaze, give the kiln two weeks.', { size: 22, fill: C.inkSoft, opacity: seg(t, 0.08, 0.28) });
      // grid 3 cols x 2 rows
      const gx = 120, gy = 360, cw = 540, gap = 28;
      ids.forEach((id, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = gx + col * (cw + gap);
        const y = gy + row * 470;
        const rev = seg(t, 0.12 + i * 0.05, 0.45 + i * 0.05, easeOut);
        const yy = y + lerp(40, 0, rev);
        // hover lift on the surahi (index 1) late in scene
        const hov = i === 1 ? seg(t, 0.62, 0.8) * 10 : 0;
        s += card(x, yy, cw, P[id], rev, hov);
      });
      s += chrome(0, 'Shop', seg(t, 0, 0.18));
      // cursor drifting to the surahi card
      const cx = lerp(W * 0.78, gx + cw + gap + cw / 2, seg(t, 0.45, 0.75));
      const cyy = lerp(H * 0.8, 520, seg(t, 0.45, 0.75));
      s += cursor(cx, cyy, false);
      return s;
    }
  },

  /* 4 — PRODUCT DETAIL ---------------------------------------------- */
  {
    name: 'product', min: 9, voLead: 0.3,
    vo: 'Open a piece. Choose your glaze, choose your size, and add it to the cart.',
    render(t) {
      const p = P['indigo-planter'];
      const glazeSeq = p.glazes; // jaipur, indigo, celadon
      // glaze switches on clicks at t≈0.45 and 0.62
      let gi = 0;
      if (t > 0.62) gi = 2; else if (t > 0.45) gi = 1;
      const glaze = glazeSeq[gi];
      const enter = seg(t, 0.05, 0.35, easeOut);
      let s = '';
      // left gallery stage
      const stageX = 120, stageY = 250, stageW = 760, stageH = 700;
      s += `<g opacity="${enter}">`;
      s += rrect(stageX, stageY + lerp(30, 0, enter), stageW, stageH, 24, 'url(#stageG)', `stroke="${C.line}"`);
      s += vessel(p, glaze, stageX + stageW / 2, stageY + stageH - 90, 1.65, { seed: p.seed });
      s += `</g>`;
      // thumbs
      glazeSeq.forEach((g, i) => {
        const tx = stageX + 30 + i * 96, ty = stageY + stageH + 30;
        const active = g === glaze;
        s += rrect(tx, ty, 84, 84, 14, C.paper2, `stroke="${active ? C.clay : C.line}" stroke-width="${active ? 3 : 1.5}"`);
        s += vessel(p, g, tx + 42, ty + 74, 0.26, { seed: p.seed });
      });
      // right info
      const ix = 960, ia = seg(t, 0.15, 0.4, easeOut);
      s += `<g opacity="${ia}" transform="translate(${lerp(30, 0, ia)},0)">`;
      s += txt(ix, 300, '★★★★★', { size: 26, fill: C.marigold }) + txt(ix + 150, 300, '4.9 · 212 reviews', { size: 19, fill: C.inkSoft });
      s += txt(ix, 345, 'HOME', { size: 15, weight: 600, fill: C.clayDeep, spacing: 2 });
      s += txt(ix, 410, 'Indigo Jali Planter', { family: SERIF, size: 54, weight: 600 });
      s += txt(ix, 465, '$64', { family: SERIF, size: 34, weight: 600 });
      s += foldText(ix, 515, 'Jaipur-blue glaze over a carved jali lip. Built for a fern that wants to be noticed.', 720, 26, C.inkSoft);
      s += txt(ix, 640, 'GLAZE', { size: 16, weight: 700, spacing: 1.5 }) + txt(ix + 140, 640, Art.GLAZES[glaze].name, { size: 22, fill: C.inkSoft });
      glazeSeq.forEach((g, i) => {
        const gx = ix + i * 96 + 30, gy = 700, active = g === glaze;
        const gg = Art.GLAZES[g];
        s += `<circle cx="${gx}" cy="${gy}" r="26" fill="${gg.base}"/>`;
        if (active) s += `<circle cx="${gx}" cy="${gy}" r="32" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
      });
      // qty + add button
      s += rrect(ix, 770, 150, 60, 30, C.card, `stroke="${C.line}"`);
      s += txt(ix + 30, 808, '−', { size: 30, fill: C.inkSoft }) + txt(ix + 75, 808, '1', { size: 22, weight: 700, anchor: 'middle' }) + txt(ix + 120, 808, '+', { size: 28, fill: C.inkSoft });
      const press = t > 0.82 && t < 0.9;
      const addW = 560;
      s += rrect(ix + 170, 770, addW, 60, 30, press ? C.clayDeep : C.clay);
      s += txt(ix + 170 + addW / 2, 808, 'Add to cart · $64', { size: 22, weight: 600, fill: '#fff7ef', anchor: 'middle' });
      s += txt(ix, 880, '● Made to order — ships in about 2 weeks', { size: 18, fill: C.neem });
      s += `</g>`;
      s += chrome(0, '', seg(t, 0, 0.18));
      // cursor: move to glaze 2, glaze 3, then add button
      let cxp, cyp, pr = false;
      if (t < 0.45) { const a = seg(t, 0.2, 0.45); cxp = lerp(W * 0.5, ix + 96 + 30, a); cyp = lerp(700, 700, a); pr = t > 0.4; }
      else if (t < 0.62) { const a = seg(t, 0.45, 0.62); cxp = lerp(ix + 126, ix + 192 + 30, a); cyp = 700; pr = t > 0.57; }
      else { const a = seg(t, 0.62, 0.85); cxp = lerp(ix + 222, ix + 170 + addW / 2, a); cyp = lerp(700, 800, a); pr = press; }
      s += cursor(cxp, cyp, pr);
      return s;
    }
  },

  /* 5 — CART + CLERK ------------------------------------------------- */
  {
    name: 'cart', min: 7, voLead: 0.3,
    vo: "You're already signed in. Clerk remembers you — so your cart and your details are simply there.",
    render(t) {
      // dim product page behind, slide drawer from right
      let s = '';
      // faint background (reuse a product-ish blur)
      s += rrect(0, 0, W, H, 0, C.paper2);
      s += vessel('indigo-planter', 'celadon', 480, 760, 1.4, { seed: 5, opacity: 0.5 });
      s += chrome(1, '', 0.5);
      // scrim
      s += rrect(0, 0, W, H, 0, `rgba(33,22,10,${0.4 * seg(t, 0.02, 0.25)})`);
      const slide = seg(t, 0.05, 0.4, easeOut);
      const dw = 620, dx = W - dw * slide;
      s += `<g transform="translate(${dx},0)">`;
      s += rrect(0, 0, dw, H, 0, C.paper, `style="filter:drop-shadow(-30px 0 60px rgba(40,20,8,.4))"`);
      s += txt(50, 90, 'Your cart', { family: SERIF, size: 38, weight: 600 });
      s += txt(dw - 50, 90, '✕', { size: 30, fill: C.inkSoft, anchor: 'end' });
      s += rrect(40, 120, dw - 80, 1.5, 0, C.line);
      // line items
      const items = [['indigo-planter', 'celadon', 1, 'River Celadon'], ['kulhad-set', 'terracotta', 2, 'Terracotta']];
      let total = 0;
      items.forEach((it, i) => {
        const p = P[it[0]], y = 175 + i * 150;
        const a = seg(t, 0.3 + i * 0.08, 0.55 + i * 0.08, easeOut);
        total += p.price * it[2];
        s += `<g opacity="${a}">`;
        s += rrect(50, y, 100, 100, 16, C.paper2, `stroke="${C.line}"`);
        s += vessel(p, it[1], 100, y + 92, 0.3, { seed: p.seed });
        s += txt(175, y + 36, p.name, { family: SERIF, size: 24, weight: 600 });
        s += txt(175, y + 68, it[3] + ' glaze', { size: 17, fill: C.inkSoft });
        s += rrect(175, y + 84, 110, 34, 17, C.card, `stroke="${C.line}"`);
        s += txt(192, y + 107, '−', { size: 22, fill: C.inkSoft }) + txt(230, y + 107, String(it[2]), { size: 18, weight: 700, anchor: 'middle' }) + txt(268, y + 107, '+', { size: 20, fill: C.inkSoft });
        s += txt(dw - 50, y + 50, Cat.money(p.price * it[2]), { family: SERIF, size: 24, weight: 600, anchor: 'end' });
        s += `</g>`;
      });
      // footer
      const fy = H - 250;
      s += rrect(40, fy, dw - 80, 1.5, 0, C.line);
      s += txt(50, fy + 50, 'Subtotal', { size: 20, fill: C.inkSoft }) + txt(dw - 50, fy + 50, Cat.money(total), { size: 20, anchor: 'end', fill: C.inkSoft });
      s += txt(50, fy + 90, 'Shipping', { size: 20, fill: C.inkSoft }) + txt(dw - 50, fy + 90, 'Free', { size: 20, anchor: 'end', fill: C.neem });
      s += txt(50, fy + 145, 'Total', { family: SERIF, size: 28, weight: 600 }) + txt(dw - 50, fy + 145, Cat.money(total), { family: SERIF, size: 28, weight: 600, anchor: 'end' });
      s += rrect(50, fy + 175, dw - 100, 58, 29, C.ink);
      s += txt(dw / 2, fy + 212, 'Checkout · ' + Cat.money(total), { size: 22, weight: 600, fill: '#f7eedd', anchor: 'middle' });
      s += `</g>`;
      // Clerk highlight callout pointing at the user chip
      const ca = seg(t, 0.55, 0.78);
      if (ca > 0.01) {
        s += `<g opacity="${ca}">`;
        s += `<circle cx="${W - 446}" cy="92" r="30" fill="none" stroke="${C.neem}" stroke-width="3"/>`;
        s += rrect(W - 720, 150, 360, 92, 16, C.ink);
        s += txt(W - 700, 188, 'Signed in with Clerk', { size: 22, weight: 600, fill: '#f7eedd' });
        s += txt(W - 700, 220, 'Cart, address & order history — remembered.', { size: 17, fill: '#cbbfa9' });
        s += `<path d="M${W - 470},150 l18,-22 l8,22 z" fill="${C.ink}"/>`;
        s += `</g>`;
      }
      return s;
    }
  },

  /* 6 — CHECKOUT + STRIPE -------------------------------------------- */
  {
    name: 'checkout', min: 9, voLead: 0.3,
    vo: 'Checkout stays calm. Payments run securely through Stripe. One tap — and it is done.',
    render(t) {
      const enter = seg(t, 0.04, 0.3, easeOut);
      let s = chrome(3, '', seg(t, 0, 0.15));
      // left form
      const lx = 120, ly = 200;
      s += `<g opacity="${enter}" transform="translate(0,${lerp(24, 0, enter)})">`;
      s += txt(lx, ly, 'CART  ›  INFORMATION  ›  DONE', { size: 16, weight: 600, fill: C.inkFaint, spacing: 2 });
      // clerk banner
      s += rrect(lx, ly + 24, 980, 86, 16, C.paper2, `stroke="${C.line}"`);
      s += `<circle cx="${lx + 44}" cy="${ly + 67}" r="22" fill="url(#avg2)"/>`;
      s += txt(lx + 44, ly + 75, 'AK', { size: 17, weight: 700, fill: '#fff', anchor: 'middle' });
      s += txt(lx + 82, ly + 60, 'Ananya Kapoor', { size: 21, weight: 600 });
      s += txt(lx + 82, ly + 88, 'ananya@example.com', { size: 17, fill: C.inkSoft });
      s += `<circle cx="${lx + 820}" cy="${ly + 67}" r="6" fill="${C.neem}"/>`;
      s += txt(lx + 838, ly + 73, 'Signed in · Clerk', { size: 16, weight: 600, fill: C.neem });
      s += `<defs><linearGradient id="avg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bf6238"/><stop offset="1" stop-color="#8a3f22"/></linearGradient></defs>`;
      // shipping
      s += txt(lx, ly + 170, '1  Shipping address', { family: SERIF, size: 26, weight: 600 });
      const field = (x, y, w, label, val) => rrect(x, y, w, 58, 11, C.card, `stroke="${C.line}"`) +
        txt(x + 16, y - 8, label, { size: 14, weight: 600, fill: C.inkSoft, spacing: 0.5 }) +
        txt(x + 16, y + 37, val, { size: 19 });
      s += field(lx, ly + 210, 980, 'FULL NAME', 'Ananya Kapoor');
      s += field(lx, ly + 300, 980, 'ADDRESS', '48 Raritan Avenue, Highland Park, NJ 08904');
      // payment / stripe element
      s += txt(lx, ly + 430, '2  Payment', { family: SERIF, size: 26, weight: 600 });
      const sx = lx, sy = ly + 460, sw = 980;
      s += rrect(sx, sy, sw, 230, 16, C.card, `stroke="${C.line}"`);
      // tabs
      ['Card', 'Apple Pay', 'Klarna'].forEach((tb, i) => {
        const tw = sw / 3, tx = sx + i * tw;
        const act = i === 0;
        s += txt(tx + tw / 2, sy + 38, tb, { size: 18, weight: 600, anchor: 'middle', fill: act ? C.ink : C.inkSoft });
        if (act) s += rrect(tx, sy + 54, tw, 3, 0, C.ink);
      });
      s += rrect(sx + 1, sy + 57, sw - 2, 1, 0, C.line);
      // card field
      s += txt(sx + 30, sy + 96, 'CARD NUMBER', { size: 13, weight: 600, fill: C.inkSoft, spacing: 0.5 });
      s += rrect(sx + 30, sy + 108, sw - 60, 56, 11, '#fff', `stroke="${C.line}"`);
      s += txt(sx + 48, sy + 144, '4242  4242  4242  4242', { size: 20, spacing: 1 });
      s += rrect(sx + sw - 130, sy + 122, 44, 28, 5, '#1a1f71') + txt(sx + sw - 108, sy + 141, 'VISA', { size: 13, weight: 800, fill: '#fff', anchor: 'middle' });
      s += rrect(sx + 30, sy + 178, (sw - 80) / 2, 42, 9, '#fff', `stroke="${C.line}"`) + txt(sx + 48, sy + 205, 'Exp  04 / 28', { size: 18, fill: C.inkSoft });
      s += rrect(sx + 50 + (sw - 80) / 2, sy + 178, (sw - 80) / 2, 42, 9, '#fff', `stroke="${C.line}"`) + txt(sx + 68 + (sw - 80) / 2, sy + 205, 'CVC  314', { size: 18, fill: C.inkSoft });
      s += `</g>`;

      // right summary
      const rx = 1240, ry = 224, rw = 560;
      s += `<g opacity="${seg(t, 0.12, 0.36, easeOut)}">`;
      s += rrect(rx, ry, rw, 600, 20, C.card, `stroke="${C.line}" style="filter:drop-shadow(0 20px 50px rgba(60,38,18,.2))"`);
      s += txt(rx + 36, ry + 56, 'Order summary', { family: SERIF, size: 26, weight: 600 });
      const sumItems = [['indigo-planter', 'celadon', 1], ['kulhad-set', 'terracotta', 2]];
      let sub = 0;
      sumItems.forEach((it, i) => {
        const p = P[it[0]], y = ry + 90 + i * 100;
        sub += p.price * it[2];
        s += rrect(rx + 36, y, 70, 70, 12, C.paper2, `stroke="${C.line}"`);
        s += vessel(p, it[1], rx + 71, y + 64, 0.21, { seed: p.seed });
        s += `<circle cx="${rx + 110}" cy="${y - 2}" r="14" fill="${C.ink}"/>` + txt(rx + 110, y + 4, String(it[2]), { size: 14, weight: 700, fill: '#f7eedd', anchor: 'middle' });
        s += txt(rx + 126, y + 30, p.name, { family: SERIF, size: 20, weight: 600 });
        s += txt(rx + 126, y + 56, Art.GLAZES[it[1]].name, { size: 15, fill: C.inkSoft });
        s += txt(rx + rw - 36, y + 42, Cat.money(p.price * it[2]), { family: SERIF, size: 21, weight: 600, anchor: 'end' });
      });
      const ship = 0, tax = Math.round(sub * 0.06625), total = sub + ship + tax;
      let yy = ry + 310;
      s += rrect(rx + 36, yy, rw - 72, 1.5, 0, C.line);
      const row = (lab, val, big) => txt(rx + 36, yy, lab, { size: big ? 24 : 18, family: big ? SERIF : SANS, weight: big ? 600 : 400, fill: big ? C.ink : C.inkSoft }) +
        txt(rx + rw - 36, yy, val, { size: big ? 24 : 18, family: big ? SERIF : SANS, weight: big ? 600 : 400, anchor: 'end', fill: big ? C.ink : C.inkSoft });
      yy += 40; s += row('Subtotal', Cat.money(sub));
      yy += 36; s += row('Shipping', 'Free');
      yy += 36; s += row('NJ tax (6.625%)', Cat.money(tax));
      yy += 52; s += row('Total', Cat.money(total), true);
      // pay button — processing late
      const processing = t > 0.8;
      yy += 40;
      s += rrect(rx + 36, yy, rw - 72, 64, 32, processing ? C.clayDeep : C.clay);
      if (processing) {
        const ang = (t * 2000) % 360;
        s += `<circle cx="${rx + rw / 2 - 80}" cy="${yy + 32}" r="13" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="3"/>`;
        s += `<path d="M${rx + rw / 2 - 80},${yy + 19} a13,13 0 0 1 13,13" fill="none" stroke="#fff" stroke-width="3" transform="rotate(${ang} ${rx + rw / 2 - 80} ${yy + 32})"/>`;
        s += txt(rx + rw / 2 + 6, yy + 40, 'Processing…', { size: 21, weight: 600, fill: '#fff7ef', anchor: 'middle' });
      } else {
        const payLabel = 'Pay ' + Cat.money(total);
        s += lock(rx + rw / 2 - (payLabel.length * 6) - 14, yy + 40, 1.1) +
          txt(rx + rw / 2 + 12, yy + 40, payLabel, { size: 21, weight: 600, fill: '#fff7ef', anchor: 'middle' });
      }
      s += txt(rx + rw / 2, yy + 100, 'Payments secured by Stripe · PCI-DSS', { size: 15, fill: C.inkFaint, anchor: 'middle' });
      // stripe wordmark accent
      s += `</g>`;
      // cursor to pay button then press
      const a = seg(t, 0.5, 0.78);
      const cxp = lerp(900, rx + rw / 2, a), cyp = lerp(700, yy + 32, a);
      s += cursor(cxp, cyp, t > 0.76 && t < 0.84);
      return s;
    }
  },

  /* 7 — CONFIRMATION ------------------------------------------------- */
  {
    name: 'done', min: 7, voLead: 0.3,
    vo: 'Order confirmed. Your pieces head to the kiln room — to be wrapped in newsprint, and sent your way.',
    render(t) {
      let s = '';
      const pop = seg(t, 0.05, 0.35, easeOutBack);
      const cx = W / 2, cy = 290;
      s += `<circle cx="${cx}" cy="${cy}" r="${60 * pop}" fill="${C.neem}" style="filter:drop-shadow(0 18px 40px rgba(111,138,85,.6))"/>`;
      if (pop > 0.5) {
        const dl = seg(t, 0.2, 0.45);
        s += `<path d="M${cx - 26},${cy} l18,18 l34,-36" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="90" stroke-dashoffset="${90 * (1 - dl)}"/>`;
      }
      s += txt(cx, 440, 'Off to the kiln-room.', { family: SERIF, size: 66, weight: 600, anchor: 'middle', opacity: seg(t, 0.25, 0.5) });
      s += `<g opacity="${seg(t, 0.32, 0.55)}">` +
        rrect(cx - 120, 480, 240, 44, 22, C.paper2, `stroke="${C.line}"`) +
        txt(cx, 510, 'Order MITTI-704182', { family: SERIF, size: 20, anchor: 'middle' }) + `</g>`;
      s += foldText(cx, 580, 'Payment confirmed. Your pieces are being thrown, glazed and fired by hand — then sent your way in about two weeks.', 900, 26, C.inkSoft, 'middle', seg(t, 0.4, 0.62));
      // receipt card
      const ra = seg(t, 0.5, 0.72, easeOut);
      const rcx = cx - 380, rcy = 700, rcw = 760;
      s += `<g opacity="${ra}" transform="translate(0,${lerp(24, 0, ra)})">`;
      s += rrect(rcx, rcy, rcw, 250, 18, C.card, `stroke="${C.line}" style="filter:drop-shadow(0 20px 50px rgba(60,38,18,.2))"`);
      s += txt(rcx + 30, rcy + 44, 'MITTI-704182', { size: 17, fill: C.inkSoft });
      s += txt(rcx + rcw - 30, rcy + 44, 'Paid $170.60 · Visa ••4242', { size: 17, fill: C.inkSoft, anchor: 'end' });
      s += rrect(rcx + 30, rcy + 62, rcw - 60, 1.5, 0, C.line);
      const items = [['indigo-planter', 'celadon', 1], ['kulhad-set', 'terracotta', 2]];
      items.forEach((it, i) => {
        const p = P[it[0]], y = rcy + 90 + i * 70;
        s += rrect(rcx + 30, y, 56, 56, 10, C.paper2, `stroke="${C.line}"`);
        s += vessel(p, it[1], rcx + 58, y + 51, 0.17, { seed: p.seed });
        s += txt(rcx + 104, y + 26, p.name, { family: SERIF, size: 20, weight: 600 });
        s += txt(rcx + 104, y + 50, Art.GLAZES[it[1]].name + ' glaze · qty ' + it[2], { size: 15, fill: C.inkSoft });
        s += txt(rcx + rcw - 30, y + 38, Cat.money(p.price * it[2]), { family: SERIF, size: 20, weight: 600, anchor: 'end' });
      });
      s += `</g>`;
      const mailA = seg(t, 0.62, 0.82);
      s += `<g opacity="${mailA}">` +
        mail(cx - 322, 1004, 1, C.inkSoft) +
        txt(cx + 16, 1010, 'A receipt is on its way to ananya@example.com  ·  via Resend', { size: 18, fill: C.inkSoft, anchor: 'middle' }) +
        `</g>`;
      return s;
    }
  },

  /* 8 — CLOSE / KICKER ----------------------------------------------- */
  {
    name: 'close', min: 10, voLead: 0.3,
    vo: 'Mitti. Handmade, from the earth up. And every piece of this shop — the pots, the page, even this voice — was made by Claude. Told you so.',
    render(t) {
      let s = '';
      // a quiet shelf of vessels
      const shelf = [['kulhad', 'terracotta', 11], ['longpi-tumbler', 'longpi', 17], ['surahi', 'rust', 23], ['marigold-bowl', 'marigold', 31], ['jaipur-vase', 'jaipur', 41]];
      shelf.forEach((v, i) => {
        const a = seg(t, 0.05 + i * 0.05, 0.4 + i * 0.05, easeOut);
        const x = W / 2 + (i - 2) * 300;
        const prod = P[v[0]] || { type: v[0], seed: v[2] };
        s += vessel(prod.type || v[0], v[1], x, lerp(560, 520, a), lerp(0.7, 0.82, a), { seed: v[2], opacity: a });
      });
      s += rrect(W / 2 - 760, 560, 1520, 2, 0, C.line, `opacity="${seg(t, 0.2, 0.5)}"`);
      s += `<g opacity="${seg(t, 0.32, 0.58)}">` + wordmark(W / 2, 700, 1.2, 1) + `</g>`;
      s += txt(W / 2, 770, 'Handmade stoneware, from the earth up.', { family: SERIF, italic: true, size: 32, anchor: 'middle', fill: C.inkSoft, opacity: seg(t, 0.42, 0.66) });
      // kicker line
      const ka = seg(t, 0.62, 0.82);
      s += txt(W / 2, 880, 'Brand, storefront, ceramics & voiceover — built by Claude.', { size: 24, anchor: 'middle', fill: C.clayDeep, weight: 600, opacity: ka });
      const ta = seg(t, 0.78, 0.94, easeOutBack);
      if (ta > 0.01) s += `<g opacity="${clamp(ta)}" transform="translate(${W / 2},950) scale(${lerp(0.85, 1, clamp(ta))})">` +
        txt(0, 0, 'Told you so.', { family: SERIF, italic: true, size: 46, weight: 600, anchor: 'middle', fill: C.ink }) + `</g>`;
      return s;
    }
  }
];

/* naive word-wrap into <text> lines */
function foldText(x, y, str, maxW, size, fill, anchor = 'start', opacity = 1) {
  const cpl = Math.floor(maxW / (size * 0.52));
  const words = str.split(' ');
  const lines = []; let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > cpl) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; });
  if (cur.trim()) lines.push(cur.trim());
  return lines.map((ln, i) => txt(x, y + i * (size * 1.35), ln, { size, fill, anchor, opacity })).join('');
}

module.exports = { SCENES };
