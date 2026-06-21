/*
 * Mitti demo film — builder.
 * 1. Synthesize a sultry female voiceover per scene (Piper TTS + ffmpeg warmth).
 * 2. Render every frame from the scene kit via sharp (SVG -> PNG).
 * 3. Assemble a timed voice track + soft ambient pad, then encode H.264 MP4.
 *
 * Pure offline: Piper voice model from GitHub, static ffmpeg from imageio-ffmpeg.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const sharp = require('sharp');
const K = require('./kit.js');
const { SCENES } = require('./scenes.js');

const FPS = 30;
const ROOT = path.join(__dirname, '..');
const FRAMES = path.join(__dirname, 'frames');
const WORK = path.join(ROOT, '.voiceover', 'work');
const OUTDIR = path.join(ROOT, 'mockup', 'demo');
const FRAMES_OUT = path.join(OUTDIR, 'frames');

const FFMPEG = execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
// Voiceover is synthesized by Kokoro (see kokoro_tts.py) — natural 24kHz neural TTS,
// voice af_bella. Model/voices live under .voiceover/kokoro (git-ignored).

function sh(cmd, args) { return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
function ensure(d) { fs.mkdirSync(d, { recursive: true }); }
function wavDuration(file) {
  const b = fs.readFileSync(file);
  // find fmt and data chunks
  let pos = 12, sampleRate = 22050, channels = 1, bits = 16, dataSize = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') { channels = b.readUInt16LE(pos + 10); sampleRate = b.readUInt32LE(pos + 12); bits = b.readUInt16LE(pos + 22); }
    else if (id === 'data') { dataSize = size; break; }
    pos += 8 + size + (size & 1);
  }
  return dataSize / (sampleRate * channels * (bits / 8));
}

/* ---------- 1. Voiceover ---------- */
function synthVO() {
  ensure(WORK);
  // Synth all lines in one Kokoro process (natural offline neural TTS; loads model once).
  const lines = {};
  SCENES.forEach((sc, i) => { lines[i] = sc.vo; });
  const linesPath = path.join(WORK, 'lines.json');
  fs.writeFileSync(linesPath, JSON.stringify(lines));
  execSync(`python3 ${JSON.stringify(path.join(__dirname, 'kokoro_tts.py'))} ${JSON.stringify(linesPath)} ${JSON.stringify(WORK)}`,
    { stdio: ['ignore', 'inherit', 'inherit'] });

  // Light, natural finishing only — a touch of warmth + gentle de-ess + loudnorm.
  // No pitch-shifting (that is what made earlier Piper takes sound robotic); Kokoro
  // is already warm and full-band at 24kHz.
  const finish = [
    'highpass=f=55',
    'equalizer=f=160:t=q:w=1.0:g=1.5',
    'equalizer=f=7600:t=q:w=2.0:g=-1.5',
    'loudnorm=I=-15:TP=-1.5:LRA=11',
    'aresample=44100'
  ].join(',');
  SCENES.forEach((sc, i) => {
    const raw = path.join(WORK, `raw_${i}.wav`);
    const out = path.join(WORK, `vo_${i}.wav`);
    sh(FFMPEG, ['-y', '-i', raw, '-af', finish, out]);
    sc._voDur = wavDuration(out);
    process.stdout.write(`  · VO ${sc.name}: ${sc._voDur.toFixed(2)}s\n`);
  });
}

/* ---------- 2. Timeline ---------- */
function buildTimeline() {
  let start = 0;
  SCENES.forEach(sc => {
    const tail = sc.name === 'close' ? 1.6 : 0.9;
    sc.dur = Math.max(sc.min, sc.voLead + sc._voDur + tail);
    sc.start = start;
    sc.frames = Math.round(sc.dur * FPS);
    start += sc.frames / FPS;
  });
  return start;
}

/* ---------- 3. Audio track ---------- */
function buildAudio(total) {
  const parts = [];
  SCENES.forEach((sc, i) => {
    const vo = path.join(WORK, `vo_${i}.wav`);
    const padded = path.join(WORK, `scene_${i}.wav`);
    const leadMs = Math.round(sc.voLead * 1000);
    sh(FFMPEG, ['-y', '-i', vo, '-af', `adelay=${leadMs},apad`, '-t', sc.dur.toFixed(3), '-ar', '44100', '-ac', '1', padded]);
    parts.push(padded);
  });
  const list = path.join(WORK, 'concat.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  const voice = path.join(WORK, 'voice.wav');
  sh(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', voice]);

  // soft ambient pad — a warm, low, slow chord bed under the voice
  const pad = path.join(WORK, 'pad.wav');
  sh(FFMPEG, ['-y',
    '-f', 'lavfi', '-i', `sine=f=110:r=44100:d=${total.toFixed(2)}`,
    '-f', 'lavfi', '-i', `sine=f=164.81:r=44100:d=${total.toFixed(2)}`,
    '-f', 'lavfi', '-i', `sine=f=220:r=44100:d=${total.toFixed(2)}`,
    '-filter_complex',
    '[0:a]volume=0.5[a];[1:a]volume=0.32[b];[2:a]volume=0.22[c];' +
    '[a][b][c]amix=inputs=3:normalize=0,tremolo=f=0.18:d=0.5,lowpass=f=520,' +
    `afade=t=in:st=0:d=2,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5,volume=0.075[out]`,
    '-map', '[out]', pad]);

  const master = path.join(WORK, 'master.wav');
  sh(FFMPEG, ['-y', '-i', voice, '-i', pad,
    '-filter_complex', '[0:a]volume=1.0[v];[1:a]volume=1.0[p];[v][p]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]',
    '-map', '[a]', '-ar', '44100', '-ac', '2', master]);
  return master;
}

/* ---------- 4. Frames ---------- */
async function renderFrames(total) {
  ensure(FRAMES);
  // clean
  for (const f of fs.readdirSync(FRAMES)) if (f.endsWith('.png')) fs.unlinkSync(path.join(FRAMES, f));
  const totalFrames = Math.round(total * FPS);
  // map each frame -> scene/localT
  let done = 0;
  const tasks = [];
  for (let f = 0; f < totalFrames; f++) {
    const time = f / FPS;
    let sc = SCENES[SCENES.length - 1];
    for (const s of SCENES) { if (time >= s.start && time < s.start + s.frames / FPS) { sc = s; break; } }
    const localT = K.clamp((time - sc.start) / (sc.frames / FPS));
    tasks.push({ f, sc, localT });
  }
  const CONC = 5;
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const my = tasks[idx++];
      const svg = K.frame(my.sc.render(my.localT));
      await sharp(Buffer.from(svg)).png({ compressionLevel: 6 }).toFile(path.join(FRAMES, String(my.f).padStart(5, '0') + '.png'));
      done++;
      if (done % 60 === 0) process.stdout.write(`  · frames ${done}/${totalFrames}\r`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  process.stdout.write(`  · frames ${totalFrames}/${totalFrames}\n`);
  return totalFrames;
}

/* ---------- 5. Encode + export stills ---------- */
function encode(master) {
  ensure(OUTDIR);
  const out = path.join(OUTDIR, 'mitti-demo.mp4');
  sh(FFMPEG, ['-y',
    '-framerate', String(FPS), '-i', path.join(FRAMES, '%05d.png'),
    '-i', master,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-vf', 'fade=t=in:st=0:d=0.6',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  return out;
}

function exportStills() {
  ensure(FRAMES_OUT);
  for (const f of fs.readdirSync(FRAMES_OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(FRAMES_OUT, f));
  // one representative still per scene for the storyboard / video-generator hand-off
  const beats = { title: 0.7, glazes: 0.78, shop: 0.72, product: 0.7, cart: 0.72, checkout: 0.62, done: 0.72, close: 0.9 };
  return Promise.all(SCENES.map(async (sc, i) => {
    const svg = K.frame(sc.render(beats[sc.name] != null ? beats[sc.name] : 0.65));
    const file = path.join(FRAMES_OUT, `${String(i + 1).padStart(2, '0')}-${sc.name}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
  }));
}

(async () => {
  console.log('Mitti demo film — building');
  console.log('1/5 voiceover (Kokoro — af_bella)…'); synthVO();
  const total = buildTimeline();
  console.log(`    timeline: ${total.toFixed(1)}s across ${SCENES.length} scenes`);
  console.log('2/5 storyboard stills…'); await exportStills();
  console.log('3/5 audio track (voice + ambient pad)…'); const master = buildAudio(total);
  console.log('4/5 rendering frames…'); await renderFrames(total);
  console.log('5/5 encoding MP4…'); const out = encode(master);
  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`\nDONE → ${out} (${mb} MB, ${total.toFixed(1)}s)`);
})().catch(e => { console.error(e); process.exit(1); });
