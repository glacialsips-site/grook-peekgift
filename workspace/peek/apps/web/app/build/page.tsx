"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { renderPeek, proofs } from "@peek/ir-render-web";
import { resolveTokens } from "@peek/vibe-resolve";
import type { Genome } from "@peek/vibe-genome";
import type { Peek } from "@peek/site-ir";

type Design = { genome: Genome; peek: Peek };
type Msg = { role: "user" | "claude"; text: string; pending?: boolean };

// Stub fallback when the live engine is unreachable (no API key / network): map the
// message to the closest hand-authored proof so the Builder always shows something real.
const VIBES: Record<string, RegExp> = {
  grandma: /gift|care|grandma|bundle|nephew|college|package|mom|dad|grandpa|son|daughter/i,
  princess: /princess|kid|child|fairy|birthday|girl|pink|unicorn/i,
  cyber: /rave|neon|club|cyber|party|night|dj|techno|warehouse/i,
  hemlock: /gear|shop|outdoor|hike|store|brand|rugged|field|trail/i,
};
function pickProof(text: string): number {
  const t = text.toLowerCase();
  for (let i = 0; i < proofs.length; i++) {
    const p = proofs[i]!;
    if (t.includes(p.name)) return i;
    const re = VIBES[p.name];
    if (re && re.test(t)) return i;
  }
  return -1;
}

async function callGenerate(payload: unknown): Promise<Design | null> {
  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Partial<Design> & { error?: string };
    if (data.error || !data.genome || !data.peek) return null;
    return { genome: data.genome, peek: data.peek };
  } catch {
    return null;
  }
}

export default function Builder() {
  // Seed with the core product (grandma gift-bundle) so the canvas is never empty.
  const seed = proofs[0]!;
  const [design, setDesign] = useState<Design>({ genome: seed.genome, peek: seed.peek });
  const [stubIdx, setStubIdx] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "claude", text: "Who's this peek for? Tell me the occasion, the recipient, and a vibe — I'll build it live." },
  ]);
  const streamRef = useRef<HTMLDivElement>(null);

  const html = useMemo(
    () => renderPeek(design.peek, design.genome, resolveTokens(design.genome)),
    [design],
  );

  function pushClaude(text: string) {
    setMsgs((m) => [...m, { role: "claude", text }]);
    queueMicrotask(() => streamRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
  }
  function settlePending(text: string) {
    setMsgs((m) => {
      const next = [...m];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i]!.pending) {
          next[i] = { role: "claude", text };
          break;
        }
      }
      return next;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text }, { role: "claude", text: "composing…", pending: true }]);
    queueMicrotask(() => streamRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));

    const payload = generated
      ? { mode: "tweak", genome: design.genome, peek: design.peek, change: text }
      : { brief: text };
    const result = await callGenerate(payload);

    if (result) {
      setDesign(result);
      setGenerated(true);
      const thesis =
        result.genome.rationale ||
        result.genome.brief?.thesis ||
        `A one-of-one ${result.peek.pageType} — ${result.peek.meta.title}.`;
      settlePending(thesis);
    } else {
      // Engine offline → closest proof, told honestly.
      const hit = pickProof(text);
      const next = hit >= 0 ? hit : (stubIdx + 1) % proofs.length;
      setStubIdx(next);
      setDesign({ genome: proofs[next]!.genome, peek: proofs[next]!.peek });
      setGenerated(true);
      settlePending(
        `Showing a ${proofs[next]!.name} vibe — live generation is offline right now, so this is a close stand-in.`,
      );
    }
    setBusy(false);
  }

  return (
    <div style={S.stage}>
      <div style={S.phone}>
        <iframe srcDoc={html} title="preview" style={S.iframe} />
        <div style={{ ...S.smoke, opacity: busy ? 0.85 : 1 }} />
        {busy && <div style={S.scan} />}
        <div style={S.header}>
          <span style={S.hbtn}>☰</span>
          <span style={S.modelPill}>✦ Opus 4.8 {busy ? "· composing" : "⌄"}</span>
          <span style={S.hbtn}>···</span>
        </div>
        <div style={S.stream} ref={streamRef}>
          {msgs.map((m, i) =>
            m.role === "claude" ? (
              <div key={i} style={{ ...S.claude, opacity: m.pending ? 0.7 : 1 }}>
                <span style={{ color: "#D97757" }}>✦ </span>
                {m.text}
                {m.pending && <span style={S.dots}>…</span>}
              </div>
            ) : (
              <div key={i} style={S.userRow}>
                <div style={S.user}>{m.text}</div>
              </div>
            ),
          )}
        </div>
        <div style={S.inputWrap}>
          <div style={S.inputPill}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder={generated ? "Tell Claude what to change…" : "Describe the gift or occasion…"}
              style={S.input}
              disabled={busy}
            />
            <button onClick={send} style={{ ...S.send, opacity: busy ? 0.5 : 1 }} disabled={busy} aria-label="send">
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  stage: { minHeight: "100vh", display: "grid", placeItems: "center", background: "radial-gradient(120% 90% at 50% -10%, #2a2030, #14101a)", padding: 20 },
  phone: { position: "relative", width: "min(440px,96vw)", height: "min(900px,94vh)", borderRadius: 44, overflow: "hidden", boxShadow: "0 40px 90px -20px rgba(0,0,0,.6)", background: "#000" },
  iframe: { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 },
  smoke: { position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(180deg, transparent, rgba(14,8,5,.5) 60%, rgba(14,8,5,.72))", pointerEvents: "none", transition: "opacity .4s ease" },
  scan: { position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg, transparent 38%, rgba(217,119,87,.10) 50%, transparent 62%)", backgroundSize: "100% 280%", animation: "none", zIndex: 3, mixBlendMode: "screen" },
  header: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "52px 14px 8px", zIndex: 5 },
  hbtn: { width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", background: "rgba(30,20,15,.4)", backdropFilter: "blur(16px) saturate(180%)", border: "0.5px solid rgba(255,255,255,.22)", fontSize: 15 },
  modelPill: { color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 999, background: "rgba(30,20,15,.42)", backdropFilter: "blur(20px) saturate(180%)", border: "0.5px solid rgba(255,255,255,.25)" },
  stream: { position: "absolute", left: 0, right: 0, bottom: 86, padding: "0 16px", display: "flex", flexDirection: "column", gap: 8, zIndex: 4, maxHeight: "40%", overflowY: "auto" },
  claude: { color: "#fff", fontFamily: "Georgia, 'Source Serif 4', serif", fontSize: 16.5, lineHeight: 1.45, textShadow: "0 1px 2px rgba(0,0,0,.6), 0 0 14px rgba(0,0,0,.4)", transition: "opacity .3s ease" },
  dots: { opacity: 0.6 },
  userRow: { display: "flex", justifyContent: "flex-end" },
  user: { maxWidth: "78%", background: "rgba(217,119,87,.8)", color: "#fff", padding: "8px 13px", borderRadius: 18, borderBottomRightRadius: 6, fontSize: 15, backdropFilter: "blur(18px) saturate(180%)" },
  inputWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: "8px 14px 22px", zIndex: 6 },
  inputPill: { display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 16px", borderRadius: 999, background: "rgba(255,250,245,.3)", backdropFilter: "blur(24px) saturate(180%)", border: "0.5px solid rgba(255,255,255,.5)" },
  input: { flex: 1, border: 0, outline: "none", background: "transparent", color: "#fff", fontSize: 15.5 },
  send: { width: 34, height: 34, borderRadius: 999, border: 0, background: "rgba(255,255,255,.92)", color: "#BF5A3D", fontSize: 16, cursor: "pointer", transition: "opacity .2s ease" },
};
