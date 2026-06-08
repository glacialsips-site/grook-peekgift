const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'public');
const SEAT = fs.readFileSync(path.join(__dirname, 'peek-design-seat.md'), 'utf8');

let _k = null;
function keys() {
  if (_k) return _k;
  let f = {};
  try { f = JSON.parse(fs.readFileSync(path.join(__dirname, '.keys.local.json'), 'utf8')); } catch (e) {}
  _k = { anthropic: process.env.ANTHROPIC_API_KEY || f.anthropic || '', fal: process.env.FAL_KEY || f.fal || '' };
  return _k;
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const TOOLS = [
  { name: 'set_page', description: "Author the WHOLE page as one freeform HTML document and show it. Call this FIRST so the page appears at once. Include your own Google Fonts <link>, a <style> block, bespoke CSS, and CSS/SVG motion. Tag every interactive/claimable thing with the data-peek-* contract. CSS/SVG only - never a <script>, <form>, <input>, or an inline data:/base64 image; for texture use gradients or SVG filters, for an image you don't have leave a treated slot.", input_schema: { type: 'object', properties: { html: { type: 'string' } }, required: ['html'] }, eager_input_streaming: true },
  { name: 'publish', description: 'Flag the page ready for the $12 checkout. Call when the page is useful, not perfect.', input_schema: { type: 'object', properties: {} } },
];
function refineFraming(currentHtml, instruction) {
  return `This is a page you already made and the creator approved. They're now asking for one change in plain words. Make the smallest change that satisfies it and keep everything else exactly as designed — same concept, same cards, same layout, same copy, same mechanics. Return the full updated page via set_page.\n\nCREATOR'S REQUEST: ${instruction}\n\nCURRENT PAGE:\n${currentHtml}`;
}

const server = http.createServer((req, res) => {
  const route = (req.url || '/').split('?')[0];
  if (req.method === 'POST' && route === '/api/generate') return handleGenerate(req, res);
  if (req.method === 'POST' && route === '/api/image') return handleImage(req, res);
  let u = decodeURIComponent(route); if (u === '/') u = '/index.html';
  const fp = path.join(ROOT, u);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(fp)] || 'application/octet-stream' });
    res.end(d);
  });
});

function readBody(req) { return new Promise((resolve) => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); }); }

async function handleGenerate(req, res) {
  let parsed; try { parsed = JSON.parse(await readBody(req)); } catch (e) { res.writeHead(400); res.end('bad json'); return; }
  const key = keys().anthropic; if (!key) { res.writeHead(500); res.end('no ANTHROPIC_API_KEY'); return; }
  let apiMessages;
  if (parsed.currentHtml && typeof parsed.currentHtml === 'string') {
    const lu = [...(parsed.messages || [])].reverse().find(m => m && m.role === 'user');
    const instr = lu ? (typeof lu.content === 'string' ? lu.content : '(see attached)') : '';
    apiMessages = [{ role: 'user', content: refineFraming(parsed.currentHtml, instr) }];
  } else {
    apiMessages = (parsed.messages || []).filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content).map(m => ({ role: m.role, content: m.content }));
  }
  if (!apiMessages.length) { res.writeHead(400); res.end('no messages'); return; }

  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' });
  const send = s => { try { res.write(s); } catch (e) {} };
  send(': warming up\n\n');
  const ping = setInterval(() => send(': ping\n\n'), 15000);
  let setPageIndex = -1;
  try {
    const up = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 32000, stream: true, system: [{ type: 'text', text: SEAT, cache_control: { type: 'ephemeral' } }], tools: TOOLS, messages: apiMessages }),
    });
    if (!up.ok || !up.body) { const t = await up.text().catch(() => ''); send(`event: error\ndata: ${JSON.stringify({ message: `upstream ${up.status}: ${t.slice(0, 400)}` })}\n\n`); clearInterval(ping); res.end(); return; }
    const reader = up.body.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        let data = ''; for (const line of block.split('\n')) if (line.startsWith('data:')) data += line.slice(5).trim();
        if (!data) continue;
        let evt; try { evt = JSON.parse(data); } catch (e) { continue; }
        const t = evt.type;
        if (t === 'content_block_start') { const cb = evt.content_block; if (cb && cb.type === 'tool_use' && cb.name === 'set_page') setPageIndex = evt.index; }
        else if (t === 'content_block_delta') {
          const d = evt.delta || {};
          if (d.type === 'text_delta' && d.text) send(`event: text\ndata: ${JSON.stringify(d.text)}\n\n`);
          else if (d.type === 'input_json_delta' && typeof d.partial_json === 'string' && evt.index === setPageIndex) send(`event: html\ndata: ${JSON.stringify(d.partial_json)}\n\n`);
        } else if (t === 'error') send(`event: error\ndata: ${JSON.stringify({ message: (evt.error && evt.error.message) || 'stream error' })}\n\n`);
      }
    }
    send(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  } catch (err) {
    send(`event: error\ndata: ${JSON.stringify({ message: String((err && err.message) || err) })}\n\n`);
  } finally { clearInterval(ping); res.end(); }
}

async function falImage({ desc, src, userImage }) {
  const falKey = keys().fal; if (!falKey) throw new Error('no FAL_KEY');
  let model, body;
  if (src === 'upload' && userImage) {
    model = 'fal-ai/flux/dev/image-to-image';
    body = { prompt: desc || 'integrate this photo into the design — cohesive, polished, true to the subject', image_url: userImage, strength: 0.5, num_images: 1 };
  } else {
    model = 'fal-ai/flux-pro/v1.1';
    body = { prompt: desc || 'a bespoke editorial illustration that fits the page', image_size: 'square_hd', num_images: 1 };
  }
  const r = await fetch('https://fal.run/' + model, { method: 'POST', headers: { 'Authorization': 'Key ' + falKey, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('fal ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  return (j.images && j.images[0] && j.images[0].url) || null;
}

async function handleImage(req, res) {
  let p; try { p = JSON.parse(await readBody(req)); } catch (e) { res.writeHead(400); res.end('bad json'); return; }
  try {
    const url = await falImage({ desc: p.desc, src: p.src, userImage: p.userImage });
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ url }));
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: String((err && err.message) || err) }));
  }
}

server.listen(8787, () => console.log('dev-server on http://localhost:8787  (static + /api/generate + /api/image)'));
