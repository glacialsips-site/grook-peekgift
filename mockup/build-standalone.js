/*
 * Bundle the Mitti storefront into a single, portable, self-contained HTML file
 * (mitti-standalone.html) — inline CSS/JS and base64 the cube assets, so the whole
 * shop opens from one file in any browser with no server. Run: node mockup/build-standalone.js
 */
const fs = require('fs');
const path = require('path');
const M = __dirname;
const rd = p => fs.readFileSync(path.join(M, p), 'utf8');
let html = rd('index.html');

// literal split/join (NOT String.replace — the code is full of `$`, which replace()
// would interpret as special replacement patterns and corrupt the output).
const repl = (find, sub) => {
  if (!html.includes(find)) throw new Error('marker not found: ' + find);
  html = html.split(find).join(sub);
};

repl('<link rel="stylesheet" href="styles.css"/>', '<style>\n' + rd('styles.css') + '\n</style>');
repl('<script src="lib/art.js"></script>', '<script>\n' + rd('lib/art.js') + '\n</script>');
repl('<script src="lib/catalog.js"></script>', '<script>\n' + rd('lib/catalog.js') + '\n</script>');
repl('<script src="app.js"></script>', '<script>\n' + rd('app.js') + '\n</script>');

const dataURI = (rel, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(path.join(M, rel)).toString('base64');
for (let i = 1; i <= 6; i++) {
  const n = String(i).padStart(2, '0');
  html = html.split('assets/cube/' + n + '.jpg').join(dataURI('assets/cube/' + n + '.jpg', 'image/jpeg'));
}
html = html.split('assets/cube/clips/01.mp4').join(dataURI('assets/cube/clips/01.mp4', 'video/mp4'));

const out = path.join(M, 'mitti-standalone.html');
fs.writeFileSync(out, html);
console.log('wrote ' + out + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
