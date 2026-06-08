class ChatOverlay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._messages = [];        // [{ role, content, attachments }]
    this._staged = [];          // attachments queued for next send
    this._streaming = false;
    this._abort = null;
    this._recording = false;
    this._recorder = null; this._recChunks = []; this._recStream = null;
    this._recog = null; this._recTimer = null; this._recStart = 0;
    this._camStream = null; this._facing = 'environment';
    this._endpoint = '/api/messages';
    this._headers = {};
    this._extras = {};
    this._transport = null;     // null → built-in Anthropic transport
    this._dragDepth = 0;
  }

  /* ----------------------------- public API ----------------------------- */
  setEndpoint(url, { headers } = {}) { if (url) this._endpoint = url; if (headers) this._headers = headers; return this; }
  setRequestExtras(obj = {}) { this._extras = obj || {}; return this; }
  setTransport(fn) { this._transport = typeof fn === 'function' ? fn : null; return this; }
  getMessages() { return this._messages.map(m => ({ role: m.role, content: m.content, attachments: (m.attachments || []).slice() })); }
  setMessages(arr = []) { this.clear(); for (const m of arr) this.pushMessage(m.role, m.content, m.attachments || []); return this; }
  focusInput() { this._ta && this._ta.focus(); return this; }

  setTheme(t = {}) {
    const map = {
      fg: '--ovl-fg', muted: '--ovl-muted', accent: '--ovl-accent', accentContrast: '--ovl-accent-contrast',
      surface: '--ovl-surface', border: '--ovl-border', userBubble: '--ovl-user-bubble', userFg: '--ovl-user-fg',
      assistantBubble: '--ovl-assistant-bubble', assistantFg: '--ovl-assistant-fg', inputBg: '--ovl-input-bg',
      radius: '--ovl-radius', font: '--ovl-font', blur: '--ovl-blur', shadow: '--ovl-shadow', z: '--ovl-z'
    };
    for (const k in t) if (map[k] != null && t[k] != null) this.style.setProperty(map[k], String(t[k]));
    return this;
  }

  pushMessage(role, content, attachments = []) {
    this._messages.push({ role, content, attachments });
    if (this._ready) this._renderMessage(role, content, attachments);
    return this;
  }

  // spine-driven streaming: const h = el.beginAssistantStream(); h.push(d); h.close();
  beginAssistantStream() {
    const { wrap, body } = this._makeBubble('assistant');
    const txt = document.createElement('div'); txt.className = 'txt'; body.appendChild(txt);
    body.classList.add('streaming'); this._list.appendChild(wrap); this._scrollToEnd();
    let acc = '';
    return {
      push: d => { acc += d; txt.innerHTML = ChatOverlay.md(acc); this._scrollToEnd(true); },
      replace: t => { acc = t; txt.innerHTML = ChatOverlay.md(acc); this._scrollToEnd(true); },
      close: () => {
        body.classList.remove('streaming');
        this._messages.push({ role: 'assistant', content: acc, attachments: [] });
        this._emit('assistant:done', { content: acc });
      }
    };
  }

  setTyping(on) { if (this._typing) { this._typing.hidden = !on; if (on) this._scrollToEnd(); } }
  clear() { this._messages = []; if (this._list) this._list.innerHTML = ''; return this; }
  stop() { if (this._abort) try { this._abort.abort(); } catch (e) {} }

  /* ------------------------------ lifecycle ------------------------------ */
  static get observedAttributes() { return ['placeholder', 'features', 'endpoint', 'disabled']; }
  attributeChangedCallback() { if (this._ready) this._applyAttrs(); }

  disconnectedCallback() {
    this.stop(); this._closeCamera(); this._stopRec();
    const vv = (typeof window !== 'undefined') && window.visualViewport;
    if (vv && this._vvHandler) { vv.removeEventListener('resize', this._vvHandler); vv.removeEventListener('scroll', this._vvHandler); }
  }

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.shadowRoot.innerHTML = ChatOverlay.template;
    const $ = s => this.shadowRoot.querySelector(s);

    this._panel = $('.panel'); this._list = $('.messages'); this._typing = $('.typing');
    this._ta = $('.ta'); this._send = $('.send'); this._chips = $('.chips');
    this._fileIn = $('.file'); this._recRow = $('.recrow'); this._recTime = $('.rectime');
    this._drop = $('.drop'); this._cam = $('.cam-modal'); this._camVideo = $('.cam-video'); this._camCanvas = $('.cam-canvas');
    this._composer = $('.composer');

    // keyboard / text
    this._ta.addEventListener('input', () => { this._autosize(); this._syncSend(); });
    this._ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !this._mobile()) { e.preventDefault(); this._submit(); }
    });
    this._send.addEventListener('click', () => this._streaming ? this.stop() : this._submit());

    // attach + camera + mic buttons
    $('.btn-attach').addEventListener('click', () => this._fileIn.click());
    $('.btn-cam').addEventListener('click', () => this._openCamera());
    $('.btn-mic').addEventListener('click', () => this._recording ? this._stopRec() : this._startRec());
    this._fileIn.addEventListener('change', e => this._ingest(e.target.files));
    $('.recstop').addEventListener('click', () => this._stopRec());

    // camera modal controls
    $('.cam-shutter').addEventListener('click', () => this._capturePhoto());
    $('.cam-cancel').addEventListener('click', () => this._closeCamera());
    $('.cam-flip').addEventListener('click', () => this._flipCamera());

    // paste images, drag-drop files (desktop standard)
    this.addEventListener('paste', e => this._onPaste(e));
    this.addEventListener('dragenter', e => { e.preventDefault(); if (this._hasFiles(e)) { this._dragDepth++; this._drop.hidden = false; } });
    this.addEventListener('dragover', e => { if (this._hasFiles(e)) e.preventDefault(); });
    this.addEventListener('dragleave', e => { if (this._hasFiles(e) && --this._dragDepth <= 0) { this._dragDepth = 0; this._drop.hidden = true; } });
    this.addEventListener('drop', e => { e.preventDefault(); this._dragDepth = 0; this._drop.hidden = true; if (e.dataTransfer?.files?.length) this._ingest(e.dataTransfer.files); });

    this._applyAttrs();
    this._trackKeyboard();
    this._syncSend();
    this._emit('ready', {});
  }

  _applyAttrs() {
    this._ta.placeholder = this.getAttribute('placeholder') || 'Message…';
    if (this.hasAttribute('endpoint')) this._endpoint = this.getAttribute('endpoint');
    const f = (this.getAttribute('features') || 'text camera attach mic').toLowerCase();
    this.shadowRoot.querySelector('.btn-attach').hidden = !/attach|file/.test(f);
    this.shadowRoot.querySelector('.btn-cam').hidden = !/camera|cam/.test(f);
    this.shadowRoot.querySelector('.btn-mic').hidden = !/mic|voice/.test(f);
    const dis = this.hasAttribute('disabled');
    this._composer.classList.toggle('is-disabled', dis);
    this._ta.disabled = dis;
  }

  /* --------------------------- helpers / utils --------------------------- */
  _emit(name, detail) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, cancelable: true, detail })); }
  _mobile() { return typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches; }
  _hasFiles(e) { return Array.from(e.dataTransfer?.types || []).includes('Files'); }
  _autosize() { this._ta.style.height = 'auto'; this._ta.style.height = Math.min(this._ta.scrollHeight, 168) + 'px'; }
  _syncSend() {
    if (this._streaming) { this._send.classList.add('stop'); this._send.disabled = false; this._send.setAttribute('aria-label', 'Stop'); return; }
    this._send.classList.remove('stop'); this._send.setAttribute('aria-label', 'Send');
    this._send.disabled = !(this._ta.value.trim() || this._staged.length);
  }
  _scrollToEnd(soft) {
    const el = this._list; if (!el) return;
    if (soft && (el.scrollHeight - el.scrollTop - el.clientHeight) > 160) return;
    el.scrollTop = el.scrollHeight;
  }
  _trackKeyboard() {
    const vv = (typeof window !== 'undefined') && window.visualViewport; if (!vv) return;
    this._vvHandler = () => this.style.setProperty('--ovl-kb', Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px');
    vv.addEventListener('resize', this._vvHandler); vv.addEventListener('scroll', this._vvHandler); this._vvHandler();
  }
  _toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    this._panel.appendChild(t); setTimeout(() => t.remove(), 3400);
  }
  static _readDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }
  static _parseDataURL(u) { const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(u || ''); return { media_type: (m && m[1]) || 'application/octet-stream', data: (m && m[3]) || '' }; }

  /* ----------------------------- attachments ----------------------------- */
  async _ingest(fileList) {
    for (const file of Array.from(fileList || [])) {
      const isImg = file.type.startsWith('image/');
      const isAud = file.type.startsWith('audio/');
      const isTxt = /^text\//.test(file.type) || /\.(txt|md|markdown|csv|json|log|ya?ml|tsv)$/i.test(file.name || '');
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
      const att = { kind: isImg ? 'image' : isAud ? 'audio' : isPdf ? 'pdf' : isTxt ? 'text' : 'file', name: file.name || 'file', type: file.type, size: file.size, blob: file, dataUrl: null, text: null };
      try {
        if (isImg || isAud || isPdf) att.dataUrl = await ChatOverlay._readDataURL(file);
        else if (isTxt) att.text = await file.text();
      } catch (e) {}
      this._staged.push(att); this._renderChip(att);
      this._emit('attachment:add', { attachment: att });
    }
    this._fileIn.value = ''; this._syncSend();
  }

  _renderChip(att) {
    const chip = document.createElement('div'); chip.className = 'chip';
    if (att.kind === 'image' && att.dataUrl) chip.innerHTML = `<img alt="">`;
    else if (att.kind === 'audio') chip.innerHTML = `<span class="ic">🎙</span><span class="nm">voice</span>`;
    else chip.innerHTML = `<span class="ic">${att.kind === 'pdf' ? '📕' : '📄'}</span><span class="nm"></span>`;
    if (att.kind === 'image' && att.dataUrl) chip.querySelector('img').src = att.dataUrl;
    const nm = chip.querySelector('.nm'); if (nm && att.kind !== 'audio') nm.textContent = att.name;
    const x = document.createElement('button'); x.className = 'x'; x.setAttribute('aria-label', 'Remove'); x.textContent = '✕';
    x.addEventListener('click', () => { this._staged = this._staged.filter(a => a !== att); chip.remove(); if (!this._staged.length) this._chips.hidden = true; this._syncSend(); this._emit('attachment:remove', { attachment: att }); });
    chip.appendChild(x); this._chips.appendChild(chip); this._chips.hidden = false;
  }

  _onPaste(e) {
    const items = e.clipboardData?.items; if (!items) return;
    const files = [];
    for (const it of items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
    if (files.length) { e.preventDefault(); this._ingest(files); }
  }

  /* ------------------------------- camera -------------------------------- */
  async _openCamera() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || (typeof window !== 'undefined' && window.isSecureContext === false)) {
      this._toast('Camera needs HTTPS + permission. Opening file picker instead.'); this._fileIn.click(); return;
    }
    try {
      this._camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this._facing }, audio: false });
      this._camVideo.srcObject = this._camStream;
      await this._camVideo.play().catch(() => {});
      this._cam.hidden = false;
    } catch (err) {
      this._toast('Camera unavailable — check permissions.'); this._closeCamera();
    }
  }
  async _flipCamera() {
    this._facing = this._facing === 'environment' ? 'user' : 'environment';
    this._stopCamTracks();
    try {
      this._camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this._facing }, audio: false });
      this._camVideo.srcObject = this._camStream; await this._camVideo.play().catch(() => {});
    } catch (e) { this._toast('Could not switch camera.'); this._closeCamera(); }
  }
  _capturePhoto() {
    const v = this._camVideo, c = this._camCanvas;
    const w = v.videoWidth || 1280, h = v.videoHeight || 720;
    c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h);
    c.toBlob(async blob => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await this._ingest([file]);
      }
      this._closeCamera();
    }, 'image/jpeg', 0.92);
  }
  _stopCamTracks() { if (this._camStream) { this._camStream.getTracks().forEach(t => t.stop()); this._camStream = null; } }
  _closeCamera() { this._stopCamTracks(); if (this._cam) this._cam.hidden = true; if (this._camVideo) this._camVideo.srcObject = null; }

  /* ----------------------------- microphone ------------------------------ */
  async _startRec() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { this._toast('Microphone unavailable — needs HTTPS + permission.'); return; }
    try { this._recStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (err) { this._toast('Microphone blocked — check permissions.'); return; }

    this._recording = true; this._recChunks = []; this._recRow.hidden = false;
    this.shadowRoot.querySelector('.btn-mic').classList.add('live'); this._ta.style.display = 'none';

    try {
      this._recorder = new MediaRecorder(this._recStream);
      this._recorder.ondataavailable = e => { if (e.data && e.data.size) this._recChunks.push(e.data); };
      this._recorder.onstop = async () => {
        const type = this._recorder.mimeType || 'audio/webm';
        const blob = new Blob(this._recChunks, { type });
        const file = new File([blob], 'voice-message', { type });
        const att = { kind: 'audio', name: 'voice-message', type, size: blob.size, blob: file, dataUrl: await ChatOverlay._readDataURL(file).catch(() => null), text: null };
        this._staged.push(att); this._renderChip(att); this._emit('attachment:add', { attachment: att }); this._syncSend();
      };
      this._recorder.start();
    } catch (e) { /* recording unsupported here; dictation may still run */ }

    // best-effort live dictation, fully optional
    const SR = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SR) {
      try {
        this._recog = new SR(); this._recog.continuous = true; this._recog.interimResults = true;
        this._recog.onresult = e => {
          let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
          this._pendingTranscript = t;
          this._emit('transcript', { text: t, final: e.results[e.results.length - 1].isFinal });
        };
        this._recog.onerror = () => {}; this._recog.start();
      } catch (e) {}
    }

    this._recStart = Date.now();
    this._recTimer = setInterval(() => {
      const s = Math.floor((Date.now() - this._recStart) / 1000);
      this._recTime.textContent = `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }, 250);
  }
  _stopRec() {
    if (!this._recording && !this._recorder) return;
    this._recording = false; this._recRow.hidden = true; this._ta.style.display = '';
    this.shadowRoot.querySelector('.btn-mic').classList.remove('live');
    clearInterval(this._recTimer); if (this._recTime) this._recTime.textContent = '00:00';
    try { this._recorder && this._recorder.state !== 'inactive' && this._recorder.stop(); } catch (e) {}
    try { this._recog && this._recog.stop(); } catch (e) {}
    if (this._recStream) { this._recStream.getTracks().forEach(t => t.stop()); this._recStream = null; }
    if (this._pendingTranscript) { this._ta.value = (this._ta.value ? this._ta.value + ' ' : '') + this._pendingTranscript; this._pendingTranscript = ''; this._autosize(); this._syncSend(); }
  }

  /* ----------------------------- send / API ------------------------------ */
  async _submit() {
    if (this._recording) this._stopRec();
    if (this._streaming || this.hasAttribute('disabled')) return;
    const text = this._ta.value.trim();
    const attachments = this._staged.slice();
    if (!text && !attachments.length) return;

    this.pushMessage('user', text, attachments);
    this._ta.value = ''; this._autosize();
    this._staged = []; this._chips.innerHTML = ''; this._chips.hidden = true; this._syncSend();

    // host may cancel default sending and drive the response itself
    const ev = new CustomEvent('message:send', { bubbles: true, composed: true, cancelable: true, detail: { text, attachments, messages: this.getMessages() } });
    this.dispatchEvent(ev);
    if (ev.defaultPrevented) return;

    this._streaming = true; this._syncSend(); this.setTyping(true);
    this._abort = new AbortController();
    const stream = this.beginAssistantStream(); let first = false;
    const transport = this._transport || ((args) => this._anthropic(args));
    try {
      const it = transport({ messages: this.getMessages(), signal: this._abort.signal });
      for await (const delta of it) { if (delta == null) continue; if (!first) { first = true; this.setTyping(false); } stream.push(String(delta)); }
    } catch (err) {
      if (err && err.name === 'AbortError') { /* user stopped */ }
      else { this.setTyping(false); stream.push((first ? '\n\n' : '') + '⚠︎ ' + (err?.message || 'request failed')); this._emit('error', { error: err }); }
    } finally {
      this.setTyping(false); stream.close(); this._streaming = false; this._abort = null; this._syncSend();
    }
  }

  // built-in Anthropic Messages transport (streaming SSE, with JSON/raw/OpenAI tolerance)
  async * _anthropic({ messages, signal }) {
    const body = JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: ChatOverlay.toAnthropicContent(m) })), stream: true, ...this._extras });
    const res = await fetch(this._endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...this._headers }, body, signal });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('HTTP ' + res.status + (t ? ' — ' + t.slice(0, 300) : '')); }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json') || !res.body) { yield ChatOverlay._extractJSON(await res.json().catch(() => ({}))); return; }

    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    const flush = function* (raw) { for (const s of ChatOverlay._parseSSE(raw)) yield s; };
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n\n')) >= 0) { const raw = buf.slice(0, i); buf = buf.slice(i + 2); yield* flush(raw); }
    }
    if (buf.trim()) yield* flush(buf);
  }

  // user message → Anthropic content (string when plain text, else block array)
  static toAnthropicContent(msg) {
    const blocks = [];
    for (const a of (msg.attachments || [])) {
      if (a.kind === 'image' && a.dataUrl) { const { media_type, data } = ChatOverlay._parseDataURL(a.dataUrl); blocks.push({ type: 'image', source: { type: 'base64', media_type, data } }); }
      else if (a.kind === 'pdf' && a.dataUrl) { const { data } = ChatOverlay._parseDataURL(a.dataUrl); blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }); }
      else if (a.kind === 'text' && a.text != null) { blocks.push({ type: 'text', text: `[file: ${a.name}]\n${a.text}` }); }
      else if (a.kind === 'audio') { /* no audio input in Messages API — emitted via event for the spine to transcribe */ }
      else { blocks.push({ type: 'text', text: `[attachment: ${a.name || 'file'}${a.type ? ' (' + a.type + ')' : ''}]` }); }
    }
    if (msg.content) blocks.push({ type: 'text', text: msg.content });
    if (!blocks.length) return '';
    if (blocks.length === 1 && blocks[0].type === 'text') return blocks[0].text;
    return blocks;
  }

  static _parseSSE(raw) {
    let data = ''; for (const line of raw.split('\n')) { if (line.startsWith('data:')) data += line.slice(5).trim(); }
    if (!data || data === '[DONE]') return [];
    let p; try { p = JSON.parse(data); } catch (e) { return [data]; }   // raw text delta
    if (p.type === 'content_block_delta') return p.delta && p.delta.type === 'text_delta' && p.delta.text ? [p.delta.text] : [];
    if (p.type === 'error') throw new Error((p.error && p.error.message) || 'stream error');
    if (typeof p.text === 'string') return [p.text];
    if (p.delta && typeof p.delta.text === 'string') return [p.delta.text];
    if (p.choices && p.choices[0]) { const c = p.choices[0].delta && p.choices[0].delta.content; return c ? [c] : []; } // OpenAI-style
    return [];
  }
  static _extractJSON(j) {
    if (!j) return '';
    if (Array.isArray(j.content)) return j.content.map(b => b && b.text ? b.text : '').join('');
    if (typeof j.completion === 'string') return j.completion;
    if (typeof j.text === 'string') return j.text;
    if (j.choices && j.choices[0]) return (j.choices[0].message && j.choices[0].message.content) || j.choices[0].text || '';
    return '';
  }

  /* ----------------------------- rendering ------------------------------- */
  _makeBubble(role) {
    const wrap = document.createElement('div'); wrap.className = 'row ' + role;
    const body = document.createElement('div'); body.className = 'bubble'; wrap.appendChild(body);
    return { wrap, body };
  }
  _renderMessage(role, content, atts = []) {
    const { wrap, body } = this._makeBubble(role);
    if (atts && atts.length) {
      const g = document.createElement('div'); g.className = 'atts';
      for (const a of atts) {
        if (a.kind === 'image' && a.dataUrl) { const im = document.createElement('img'); im.src = a.dataUrl; im.alt = ''; g.appendChild(im); }
        else if (a.kind === 'audio' && a.dataUrl) { const au = document.createElement('audio'); au.controls = true; au.src = a.dataUrl; g.appendChild(au); }
        else { const f = document.createElement('div'); f.className = 'file-pill'; f.textContent = (a.kind === 'pdf' ? '📕 ' : '📄 ') + (a.name || 'file'); g.appendChild(f); }
      }
      body.appendChild(g);
    }
    if (content) { const tx = document.createElement('div'); tx.className = 'txt'; tx.innerHTML = ChatOverlay.md(content); body.appendChild(tx); }
    this._list.appendChild(wrap); this._scrollToEnd();
  }

  /* -------------------- minimal, escaped markdown subset ----------------- */
  static esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  static md(src) {
    const blocks = []; let s = String(src);
    s = s.replace(/```([\s\S]*?)```/g, (_, c) => { blocks.push(c); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    s = ChatOverlay.esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
         .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
         .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
         .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
         .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
         .replace(/\n/g, '<br>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<pre><code>' + ChatOverlay.esc(blocks[+i]) + '</code></pre>');
    return s;
  }
}

/* ----------------- styles + markup (isolated in shadow root) ------------- */
ChatOverlay.template = `
<style>
  :host{
    --ovl-z:2147483600;
    --ovl-font:ui-sans-serif, system-ui, -apple-system, sans-serif;
    --ovl-fg:#ececed; --ovl-muted:#8c8c93;
    --ovl-accent:#5b6cff; --ovl-accent-contrast:#ffffff;
    --ovl-surface:#17181c; --ovl-border:rgba(255,255,255,.10);
    --ovl-user-bubble:var(--ovl-accent); --ovl-user-fg:var(--ovl-accent-contrast);
    --ovl-assistant-bubble:rgba(30,32,38,.72); --ovl-assistant-fg:var(--ovl-fg);
    --ovl-input-bg:rgba(22,23,28,.62); --ovl-radius:22px; --ovl-blur:18px;
    --ovl-shadow:0 24px 60px -20px rgba(0,0,0,.55); --ovl-kb:0px;

    position:fixed; inset:0; z-index:var(--ovl-z); pointer-events:none;
    font-family:var(--ovl-font); color:var(--ovl-fg);
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; display:block;
  }
  *{box-sizing:border-box}
  [hidden]{display:none!important}  /* fix: .cam-modal/.drop/.recrow/.typing set display:* which otherwise defeats the hidden attribute */
  .panel{position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end;
    padding:0 max(12px,env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom) + var(--ovl-kb)) max(12px,env(safe-area-inset-left));}
  .stage{width:100%; max-width:760px; margin:0 auto; display:flex; flex-direction:column; min-height:0}

  .messages{pointer-events:auto; overflow-y:auto; margin-top:auto; max-height:min(72vh,72dvh);
    display:flex; flex-direction:column; gap:12px; padding:64px 6px 14px;
    -webkit-mask-image:linear-gradient(to bottom, transparent 0, #000 88px, #000 100%);
            mask-image:linear-gradient(to bottom, transparent 0, #000 88px, #000 100%);
    scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.18) transparent;}
  .messages::-webkit-scrollbar{width:6px}
  .messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16); border-radius:3px}

  .row{display:flex; animation:rise .4s cubic-bezier(.2,.8,.2,1) both}
  .row.user{justify-content:flex-end}
  @keyframes rise{from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none}}
  .bubble{max-width:84%; padding:11px 15px; border-radius:var(--ovl-radius); line-height:1.45; font-size:15px;
    word-wrap:break-word; overflow-wrap:anywhere; backdrop-filter:blur(calc(var(--ovl-blur) * .7));
    transition:background .6s ease, color .6s ease, border-color .6s ease;}
  .row.user .bubble{background:var(--ovl-user-bubble); color:var(--ovl-user-fg);
    border:1px solid color-mix(in oklab,var(--ovl-user-bubble) 70%, #000 12%); border-bottom-right-radius:7px;}
  .row.assistant .bubble{background:var(--ovl-assistant-bubble); color:var(--ovl-assistant-fg);
    border:1px solid var(--ovl-border); border-bottom-left-radius:7px;}
  .bubble .txt a{color:inherit; text-underline-offset:2px}
  .bubble code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.9em; background:rgba(255,255,255,.10); padding:1px 5px; border-radius:6px}
  .bubble pre{margin:6px 0; padding:10px 12px; border-radius:12px; overflow:auto; background:rgba(0,0,0,.28); border:1px solid var(--ovl-border)}
  .bubble pre code{background:none; padding:0}
  .bubble.streaming .txt::after{content:'▍'; margin-left:1px; animation:blink 1s steps(2) infinite; opacity:.7}
  @keyframes blink{50%{opacity:0}}
  .atts{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px}
  .atts img{width:120px; height:120px; object-fit:cover; border-radius:12px; display:block}
  .atts audio{height:38px}
  .file-pill{font-size:13px; padding:7px 11px; border-radius:10px; background:rgba(255,255,255,.10)}

  .typing{align-self:flex-start; display:flex; gap:5px; padding:13px 16px; border-radius:var(--ovl-radius);
    background:var(--ovl-assistant-bubble); border:1px solid var(--ovl-border); pointer-events:auto}
  .typing span{width:7px; height:7px; border-radius:50%; background:var(--ovl-muted); animation:bob 1.2s infinite}
  .typing span:nth-child(2){animation-delay:.15s}.typing span:nth-child(3){animation-delay:.3s}
  @keyframes bob{0%,60%,100%{transform:translateY(0); opacity:.4}30%{transform:translateY(-5px); opacity:1}}

  .chips{pointer-events:auto; display:flex; gap:8px; flex-wrap:wrap; padding:0 4px 10px; margin-top:10px}
  .chip{position:relative; display:flex; align-items:center; gap:7px; padding:6px 9px; border-radius:12px;
    background:var(--ovl-input-bg); border:1px solid var(--ovl-border); font-size:12.5px; backdrop-filter:blur(var(--ovl-blur))}
  .chip img{width:34px; height:34px; border-radius:7px; object-fit:cover}
  .chip .x{border:none; background:rgba(0,0,0,.4); color:#fff; width:18px; height:18px; border-radius:50%; cursor:pointer; font-size:10px; line-height:1; display:grid; place-items:center}
  .chip .nm{max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}

  .composer{pointer-events:auto; display:flex; align-items:flex-end; gap:6px; padding:7px 7px 7px 12px; border-radius:26px;
    background:var(--ovl-input-bg); border:1px solid var(--ovl-border); box-shadow:var(--ovl-shadow);
    backdrop-filter:blur(var(--ovl-blur)) saturate(1.4); transition:background .6s ease, border-color .6s ease}
  .composer.is-disabled{opacity:.55; pointer-events:none}
  .ta{flex:1; resize:none; border:none; outline:none; background:transparent; color:var(--ovl-fg);
    font:inherit; font-size:16px; line-height:1.4; max-height:168px; padding:9px 2px; min-height:24px}
  .ta::placeholder{color:var(--ovl-muted)}
  .iconbtn{flex:0 0 auto; width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; background:transparent;
    color:var(--ovl-fg); display:grid; place-items:center; transition:background .2s ease, transform .15s ease, color .3s ease; opacity:.9}
  .iconbtn:hover{background:rgba(255,255,255,.10); opacity:1}
  .iconbtn svg{width:21px; height:21px; stroke:currentColor; stroke-width:1.8; fill:none; stroke-linecap:round; stroke-linejoin:round}
  .btn-mic.live{color:#ff5a5a; background:rgba(255,90,90,.14); animation:pulse 1.2s infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,90,90,.4)}50%{box-shadow:0 0 0 7px rgba(255,90,90,0)}}
  .send{flex:0 0 auto; width:42px; height:42px; border-radius:50%; border:none; cursor:pointer;
    background:var(--ovl-accent); color:var(--ovl-accent-contrast); display:grid; place-items:center;
    transition:background .3s ease, transform .15s ease, opacity .2s ease}
  .send:hover:not(:disabled){transform:translateY(-1px)}
  .send:disabled{opacity:.4; cursor:default}
  .send svg{width:20px; height:20px; stroke:currentColor; stroke-width:2; fill:none; stroke-linecap:round; stroke-linejoin:round}
  .send .i-stop{display:none} .send.stop .i-send{display:none} .send.stop .i-stop{display:block}

  .recrow{display:flex; align-items:center; gap:10px; flex:1; padding:9px 4px; color:var(--ovl-fg)}
  .recdot{width:11px; height:11px; border-radius:50%; background:#ff5a5a; animation:blink 1s steps(2) infinite}
  .rectime{font-variant-numeric:tabular-nums; font-size:15px}
  .recrow .lbl{color:var(--ovl-muted); font-size:13px}
  .recstop{margin-left:auto; border:none; cursor:pointer; background:rgba(255,90,90,.16); color:#ff7a7a; padding:7px 13px; border-radius:999px; font:inherit; font-size:13px; font-weight:600}

  .drop{position:absolute; inset:0; pointer-events:none; display:grid; place-items:center;
    background:color-mix(in oklab,var(--ovl-surface) 50%, transparent); backdrop-filter:blur(4px)}
  .drop-inner{padding:22px 30px; border:2px dashed var(--ovl-border); border-radius:18px; color:var(--ovl-fg); font-size:15px; background:var(--ovl-input-bg)}

  .cam-modal{position:absolute; inset:0; pointer-events:auto; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center}
  .cam-video{width:100%; height:100%; object-fit:cover; background:#000}
  .cam-canvas{display:none}
  .cam-controls{position:absolute; bottom:calc(28px + env(safe-area-inset-bottom)); left:0; right:0; display:flex; align-items:center; justify-content:center; gap:40px}
  .cam-shutter{width:72px; height:72px; border-radius:50%; background:#fff; border:5px solid rgba(255,255,255,.45); cursor:pointer; transition:transform .12s ease}
  .cam-shutter:active{transform:scale(.92)}
  .cam-cancel,.cam-flip{position:absolute; bottom:24px; color:#fff; background:rgba(255,255,255,.14); border:none; cursor:pointer; font:inherit; border-radius:999px}
  .cam-cancel{left:24px; padding:10px 16px; font-size:14px}
  .cam-flip{right:24px; width:46px; height:46px; font-size:22px; line-height:1; border-radius:50%}

  .toast{position:absolute; left:50%; bottom:96px; transform:translateX(-50%); pointer-events:none;
    background:rgba(20,20,24,.94); color:#fff; font-size:13px; padding:9px 14px; border-radius:12px;
    border:1px solid var(--ovl-border); box-shadow:var(--ovl-shadow); animation:rise .3s both; max-width:80%; text-align:center}

  .hidden-input{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none}
  @media (max-width:520px){ .bubble{max-width:90%} }
  @media (prefers-reduced-motion:reduce){ *{animation:none!important; transition:none!important} }
</style>

<div class="panel">
  <div class="stage">
    <div class="messages" role="log" aria-live="polite" aria-label="Conversation"></div>
    <div class="typing" hidden><span></span><span></span><span></span></div>
    <div class="chips" hidden></div>
    <div class="composer">
      <button class="iconbtn btn-attach" type="button" aria-label="Attach file" title="Attach">
        <svg viewBox="0 0 24 24"><path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8"/></svg>
      </button>
      <button class="iconbtn btn-cam" type="button" aria-label="Take photo" title="Camera">
        <svg viewBox="0 0 24 24"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v10A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5z"/><circle cx="12" cy="13" r="3.4"/></svg>
      </button>
      <textarea class="ta" rows="1" aria-label="Message"></textarea>
      <div class="recrow" hidden><span class="recdot"></span><span class="rectime">00:00</span><span class="lbl">recording…</span><button class="recstop" type="button">Stop</button></div>
      <button class="iconbtn btn-mic" type="button" aria-label="Record voice" title="Voice">
        <svg viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>
      </button>
      <button class="send" type="button" aria-label="Send" disabled>
        <svg class="i-send" viewBox="0 0 24 24"><path d="M12 20V5M5 12l7-7 7 7"/></svg>
        <svg class="i-stop" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/></svg>
      </button>
    </div>
  </div>

  <div class="drop" hidden><div class="drop-inner">Drop files to attach</div></div>

  <div class="cam-modal" hidden>
    <video class="cam-video" autoplay playsinline muted></video>
    <canvas class="cam-canvas" hidden></canvas>
    <button class="cam-cancel" type="button">Cancel</button>
    <button class="cam-shutter" type="button" aria-label="Capture"></button>
    <button class="cam-flip" type="button" aria-label="Switch camera">⟲</button>
  </div>

  <input class="file hidden-input" type="file" multiple
    accept="image/*,application/pdf,text/*,.txt,.md,.csv,.json,.log,.yaml,.yml,.tsv" />
</div>`;

/* SSR-safe registration — no-ops on the server, never double-defines */
if (typeof window !== 'undefined' && typeof HTMLElement !== 'undefined') {
  if (!customElements.get('chat-overlay')) customElements.define('chat-overlay', ChatOverlay);
}

export { ChatOverlay };
export default ChatOverlay;
