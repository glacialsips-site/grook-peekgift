"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { renderPeek, proofs } from "@peek/ir-render-web";
import { resolveTokens } from "@peek/vibe-resolve";

type Msg = { role: "user" | "claude"; text: string };

// Stub generation until ANTHROPIC_API_KEY lands: map the message to a vibe.
// Real Claude (genome synthesis) drops into this exact seam.
const VIBES: Record<string, RegExp> = {
  grandma: /gift|care|grandma|bundle|nephew|college|package|mom|dad/i,
  princess: /princess|kid|child|fairy|birthday|girl|pink/i,
  cyber: /rave|neon|club|cyber|party|night|dj|techno/i,
  hemlock: /gear|shop|outdoor|hike|store|brand|rugged/i,
};

function pickVibe(text: string): number {
  const t = text.toLowerCase();
  for (let i = 0; i < proofs.length; i++) {
    const p = proofs[i]!;
    if (t.includes(p.name)) return i;
    const re = VIBES[p.name];
    if (re && re.test(t)) return i;
  }
  return -1;
}

export default function Builder() {
  const [idx, setIdx] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "claude", text: "Who's this peek for? Tell me the occasion and a vibe." },
  ]);
  const [input, setInput] = useState("");

  const cur = proofs[idx]!;
  const html = useMemo(() => renderPeek(cur.peek, cur.genome, resolveTokens(cur.genome)), [cur]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const hit = pickVibe(text);
    const next = hit >= 0 ? hit : (idx + 1) % proofs.length;
    setIdx(next);
    setMsgs((m) => [
      ...m,
      { role: "user", text },
      { role: "claude", text: `Building a ${proofs[next]!.name} vibe — watch it come together. (stub: real Claude lands with the API key)` },
    ]);
    setInput("");
  }

  return (
    <div style={S.stage}>
      <div style={S.phone}>
        <iframe srcDoc={html} title="preview" style={S.iframe} />
        <div style={S.smoke} />
        <div style={S.header}>
          <span style={S.hbtn}>☰</span>
          <span style={S.modelPill}>✦ Sonnet 4.5 ⌄</span>
          <span style={S.hbtn}>···</span>
        </div>
        <div style={S.stream}>
          {msgs.map((m, i) =>
            m.role === "claude" ? (
              <div key={i} style={S.claude}>
                <span style={{ color: "#D97757" }}>✦ </span>
                {m.text}
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
              placeholder="Tell Claude what to change…"
              style={S.input}
            />
            <button onClick={send} style={S.send} aria-label="send">
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
  smoke: { position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(180deg, transparent, rgba(14,8,5,.5) 60%, rgba(14,8,5,.72))", pointerEvents: "none" },
  header: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "52px 14px 8px", zIndex: 5 },
  hbtn: { width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", background: "rgba(30,20,15,.4)", backdropFilter: "blur(16px) saturate(180%)", border: "0.5px solid rgba(255,255,255,.22)", fontSize: 15 },
  modelPill: { color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 999, background: "rgba(30,20,15,.42)", backdropFilter: "blur(20px) saturate(180%)", border: "0.5px solid rgba(255,255,255,.25)" },
  stream: { position: "absolute", left: 0, right: 0, bottom: 86, padding: "0 16px", display: "flex", flexDirection: "column", gap: 8, zIndex: 4, maxHeight: "40%", overflowY: "auto" },
  claude: { color: "#fff", fontFamily: "Georgia, 'Source Serif 4', serif", fontSize: 16.5, lineHeight: 1.45, textShadow: "0 1px 2px rgba(0,0,0,.6), 0 0 14px rgba(0,0,0,.4)" },
  userRow: { display: "flex", justifyContent: "flex-end" },
  user: { maxWidth: "78%", background: "rgba(217,119,87,.8)", color: "#fff", padding: "8px 13px", borderRadius: 18, borderBottomRightRadius: 6, fontSize: 15, backdropFilter: "blur(18px) saturate(180%)" },
  inputWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: "8px 14px 22px", zIndex: 6 },
  inputPill: { display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 16px", borderRadius: 999, background: "rgba(255,250,245,.3)", backdropFilter: "blur(24px) saturate(180%)", border: "0.5px solid rgba(255,255,255,.5)" },
  input: { flex: 1, border: 0, outline: "none", background: "transparent", color: "#fff", fontSize: 15.5 },
  send: { width: 34, height: 34, borderRadius: 999, border: 0, background: "rgba(255,255,255,.92)", color: "#BF5A3D", fontSize: 16, cursor: "pointer" },
};
