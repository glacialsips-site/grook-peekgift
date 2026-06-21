/* Generate six square poster images for the studio cube gallery. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const K = require('./kit.js');
const { C, SERIF, SANS, DEVA, Art } = K;
const { rrect, txt, vessel, glazeBlob } = K;

const S = 900;
const OUT = path.join(__dirname, '..', 'mockup', 'assets', 'cube');
fs.mkdirSync(OUT, { recursive: true });

function square(inner, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    `<defs><radialGradient id="stg" cx="0.5" cy="0.32" r="0.85">` +
    `<stop offset="0" stop-color="#f8f0e1"/><stop offset="0.6" stop-color="#efe1c8"/><stop offset="1" stop-color="#e3d0ac"/></radialGradient>` +
    `<linearGradient id="stageG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f0e1"/><stop offset="1" stop-color="#e6d4b4"/></linearGradient></defs>` +
    `<rect width="${S}" height="${S}" fill="${bg || 'url(#stg)'}"/>${inner}` +
    // caption gradient + label handled by caller
    `</svg>`;
}
function caption(label) {
  return `<rect x="0" y="${S - 150}" width="${S}" height="150" fill="url(#capg)"/>` +
    `<defs><linearGradient id="capg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1608" stop-opacity="0"/><stop offset="1" stop-color="#2a1608" stop-opacity="0.78"/></linearGradient></defs>` +
    txt(54, S - 56, label, { size: 38, family: SERIF, weight: 600, fill: '#fbeede' });
}
function shadow(cx, cy, rx) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#3a2410" opacity="0.2"/>`; }

const posters = [
  // 1 — hero surahi
  () => shadow(S / 2, 700, 200) + vessel('surahi', 'rust', S / 2, 720, 2.0, { seed: 23 }) + caption('Wheel-thrown to order'),
  // 2 — glaze kitchen closeup
  () => {
    let s = '';
    const keys = ['terracotta', 'jaipur', 'marigold', 'neem', 'longpi', 'saffron', 'celadon'];
    const pts = [[230, 300, 120], [560, 250, 95], [720, 470, 130], [300, 560, 140], [560, 640, 90], [770, 720, 80], [180, 760, 70]];
    pts.forEach((p, i) => { s += glazeBlob(p[0], p[1], p[2], keys[i % keys.length]); });
    return s + caption('Glazed by hand');
  },
  // 3 — trio small batch
  () => shadow(260, 720, 130) + shadow(S / 2, 745, 150) + shadow(640, 720, 130) +
    vessel('kulhad', 'terracotta', 250, 730, 1.25, { seed: 11 }) +
    vessel('marigold-bowl', 'marigold', S / 2, 752, 1.45, { seed: 31 }) +
    vessel('jaipur-vase', 'jaipur', 650, 730, 1.25, { seed: 41 }) + caption('Small-batch, never mass-made'),
  // 4 — on the wheel
  () => {
    const cx = S / 2, cy = 560;
    let s = `<ellipse cx="${cx}" cy="${cy + 120}" rx="320" ry="60" fill="#6f4a2a"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="200" fill="#5d3d22"/>`;
    for (let r = 30; r < 200; r += 16) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#4a3019" stroke-width="3" opacity="0.6"/>`;
    // a rising clay form
    s += `<path d="M${cx - 70},${cy} q-6,-120 70,-150 q76,30 70,150 z" fill="url(#clayg)"/>`;
    s += `<defs><linearGradient id="clayg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8a06a"/><stop offset="1" stop-color="#a8703f"/></linearGradient></defs>`;
    s += `<ellipse cx="${cx}" cy="${cy - 150}" rx="70" ry="18" fill="#8a5a30"/>`;
    return s + caption('On the wheel');
  },
  // 5 — kulhads for chai
  () => shadow(330, 720, 120) + shadow(600, 730, 110) +
    vessel('kulhad', 'terracotta', 330, 740, 1.6, { seed: 11 }) +
    vessel('kulhad', 'haldi', 600, 720, 1.3, { seed: 12 }) + caption('Kulhads for the morning chai'),
  // 6 — longpi black
  () => shadow(S / 2, 720, 150) + vessel('longpi-tumbler', 'longpi', S / 2, 740, 1.9, { seed: 17 }) + caption('Longpi black stoneware')
];

(async () => {
  for (let i = 0; i < posters.length; i++) {
    const svg = square(posters[i]());
    const file = path.join(OUT, String(i + 1).padStart(2, '0') + '.jpg');
    await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(file);
    console.log('  ·', path.basename(file));
  }
  console.log('cube posters →', OUT);
})();
