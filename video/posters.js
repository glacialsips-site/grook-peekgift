/* Generate six 9:16 portrait poster images for the studio video drum. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const K = require('./kit.js');
const { C, SERIF, Art } = K;
const { txt, vessel, glazeBlob } = K;

const W = 540, H = 960, CX = W / 2;
const OUT = path.join(__dirname, '..', 'mockup', 'assets', 'cube');
fs.mkdirSync(OUT, { recursive: true });

function frame(inner, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><radialGradient id="stg" cx="0.5" cy="0.34" r="0.9">` +
    `<stop offset="0" stop-color="#f8f0e1"/><stop offset="0.6" stop-color="#efe1c8"/><stop offset="1" stop-color="#e3d0ac"/></radialGradient>` +
    `<linearGradient id="stageG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f0e1"/><stop offset="1" stop-color="#e6d4b4"/></linearGradient>` +
    `<linearGradient id="capg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1608" stop-opacity="0"/><stop offset="1" stop-color="#2a1608" stop-opacity="0.8"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="${bg || 'url(#stg)'}"/>${inner}</svg>`;
}
function caption(label) {
  return `<rect x="0" y="${H - 170}" width="${W}" height="170" fill="url(#capg)"/>` +
    txt(CX, H - 54, label, { size: 34, family: SERIF, weight: 600, fill: '#fbeede', anchor: 'middle' });
}
function shadow(cx, cy, rx) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#3a2410" opacity="0.2"/>`; }

const posters = [
  // 1 — hero surahi
  () => shadow(CX, 760, 175) + vessel('surahi', 'rust', CX, 790, 2.3, { seed: 23 }) + caption('Wheel-thrown to order'),
  // 2 — glaze kitchen
  () => {
    const keys = ['terracotta', 'jaipur', 'marigold', 'neem', 'longpi', 'saffron'];
    const pts = [[170, 300, 110], [380, 250, 86], [300, 470, 130], [150, 600, 80], [410, 560, 100], [330, 720, 70]];
    let s = ''; pts.forEach((p, i) => { s += glazeBlob(p[0], p[1], p[2], keys[i % keys.length]); });
    return s + caption('Glazed by hand');
  },
  // 3 — small batch trio (stacked)
  () => shadow(CX, 420, 120) + shadow(CX, 760, 150) +
    vessel('jaipur-vase', 'jaipur', CX, 440, 1.3, { seed: 41 }) +
    vessel('marigold-bowl', 'marigold', CX, 790, 1.7, { seed: 31 }) + caption('Small-batch, never mass-made'),
  // 4 — on the wheel
  () => {
    const cx = CX, cy = 560;
    let s = `<ellipse cx="${cx}" cy="${cy + 130}" rx="240" ry="48" fill="#6f4a2a"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="180" fill="#5d3d22"/>`;
    for (let r = 28; r < 180; r += 15) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#4a3019" stroke-width="3" opacity="0.6"/>`;
    s += `<path d="M${cx - 64},${cy} q-6,-118 64,-146 q70,28 64,146 z" fill="url(#clayg)"/>`;
    s += `<defs><linearGradient id="clayg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8a06a"/><stop offset="1" stop-color="#a8703f"/></linearGradient></defs>`;
    s += `<ellipse cx="${cx}" cy="${cy - 146}" rx="64" ry="16" fill="#8a5a30"/>`;
    return s + caption('On the wheel');
  },
  // 5 — kulhads for chai
  () => shadow(200, 770, 120) + shadow(360, 660, 96) +
    vessel('kulhad', 'terracotta', 200, 790, 1.7, { seed: 11 }) +
    vessel('kulhad', 'haldi', 365, 680, 1.3, { seed: 12 }) + caption('Kulhads for the morning chai'),
  // 6 — longpi black
  () => shadow(CX, 770, 150) + vessel('longpi-tumbler', 'longpi', CX, 800, 2.2, { seed: 17 }) + caption('Longpi black stoneware')
];

(async () => {
  for (let i = 0; i < posters.length; i++) {
    const svg = frame(posters[i]());
    const file = path.join(OUT, String(i + 1).padStart(2, '0') + '.jpg');
    await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(file);
    console.log('  ·', path.basename(file));
  }
  console.log('drum posters (9:16) →', OUT);
})();
