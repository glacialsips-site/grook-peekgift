"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { emptyDocument, render, validatePeekIR, type PeekIR } from "@peek/core";
import { PeekPreview } from "@/components/preview";

type Msg = { role: "user" | "assistant"; content: string };
type PendingImage = { file: File; preview: string };
type ApiBlock = { type: "text"; text: string } | { type: "image"; source: { type: "url"; url: string } };

const GREETING =
  "hey — who are we making something for? give me the person + the occasion in a line, however sloppy. snap a photo of the thing, paste a link, or just talk — whatever's easiest.";

function newPeekId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `peek-${Math.random().toString(36).slice(2, 12)}`;
}

const ICON = {
  cam: "M12 9a3.2 3.2 0 1 0 0 6.4A3.2 3.2 0 0 0 12 9Zm0-5 1.7 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.3L12 4Z",
  mic: "M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z",
};

function IconBtn({ d, label, onClick, active }: { d: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        background: active ? "rgba(255,120,90,0.9)" : "rgba(255,255,255,0.14)",
        border: "0.5px solid rgba(255,255,255,0.32)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d={d} />
      </svg>
    </button>
  );
}

export default function Studio() {
  const [doc, setDoc] = useState<PeekIR>(() => {
    const id = newPeekId();
    return emptyDocument({ id, slug: id.slice(0, 8), curator_id: "anon" });
  });
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [kb, setKb] = useState(0);
  const [pinged, setPinged] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const pingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const model = useMemo(() => render(doc), [doc]);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage({ file: f, preview: URL.createObjectURL(f) });
  }

  function startMic() {
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; start: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setMessages((m) => [...m, { role: "assistant", content: "(voice isn't supported in this browser — type or snap a photo instead)" }]);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (ev) => setInput((prev) => (prev ? prev + " " : "") + ev.results[0][0].transcript);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function send() {
    const text = input.trim();
    if ((!text && !pendingImage) || busy) return;
    const img = pendingImage;
    const display: Msg = { role: "user", content: text || (img ? "📷 photo" : "") };
    setMessages((m) => [...m, display]);
    setInput("");
    setPendingImage(null);
    setBusy(true);
    setCollapsed(false);

    // Host the photo so it has a real URL — no base64. The model reads it BY URL (vision)
    // and uses that same url for the hero or a card's media.
    let hostedUrl: string | null = null;
    if (img) {
      try {
        const fd = new FormData();
        fd.append("file", img.file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const uj = (await up.json().catch(() => ({}))) as { url?: string; error?: string };
        if (up.ok && uj.url) {
          hostedUrl = uj.url;
        } else {
          setMessages((m) => [...m, { role: "assistant", content: `(couldn't upload that photo${uj.error ? ` — ${uj.error}` : ""}. mind trying another?)` }]);
          setBusy(false);
          return;
        }
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "(couldn't upload that photo — network hiccup. try again?)" }]);
        setBusy(false);
        return;
      }
      URL.revokeObjectURL(img.preview);
    }

    const apiContent: string | ApiBlock[] =
      img && hostedUrl
        ? [
            ...(text ? [{ type: "text" as const, text }] : []),
            { type: "text" as const, text: `[the curator just uploaded a photo, now at ${hostedUrl} — set it as the hero via set_hero_media with this exact url if it's the recipient/scene/vibe, or add it as a card's media if it's a product. read it for art-direction either way.]` },
            { type: "image" as const, source: { type: "url" as const, url: hostedUrl } },
          ]
        : text;
    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: apiContent },
    ];
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc, messages: apiMessages }),
      });
      if (res.status === 503) {
        setMessages((m) => [...m, { role: "assistant", content: "(the curator model isn't keyed here yet — set ANTHROPIC_API_KEY. everything else is live.)" }]);
        return;
      }
      if (!res.ok || !res.body) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages((m) => [...m, { role: "assistant", content: `(error: ${e.error ?? res.status})` }]);
        return;
      }
      // Stream: append an assistant bubble and fill it as text + page snapshots arrive,
      // so the page builds itself in real time.
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let ev: { type: string; delta?: string; doc?: unknown; error?: string; pinged?: string[] };
          try {
            ev = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (ev.type === "text" && ev.delta) {
            acc += ev.delta;
            setMessages((m) => {
              const c = m.slice();
              c[c.length - 1] = { role: "assistant", content: acc };
              return c;
            });
          } else if ((ev.type === "page" || ev.type === "done") && ev.doc) {
            const v = validatePeekIR(ev.doc);
            if (v.ok) setDoc(v.value);
            if (ev.pinged && ev.pinged.length) {
              setPinged(ev.pinged);
              if (pingRef.current) clearTimeout(pingRef.current);
              pingRef.current = setTimeout(() => setPinged([]), 1600);
            }
          } else if (ev.type === "error" && ev.error) {
            acc += `\n(${ev.error})`;
            setMessages((m) => {
              const c = m.slice();
              c[c.length - 1] = { role: "assistant", content: acc };
              return c;
            });
          }
        }
      }
      if (!acc.trim()) {
        setMessages((m) => {
          const c = m.slice();
          c[c.length - 1] = { role: "assistant", content: "(updated the page)" };
          return c;
        });
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "(network hiccup — try again)" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <PeekPreview model={model} pinged={pinged} />
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

      <div
        style={{
          position: "absolute",
          zIndex: 50,
          left: 0,
          right: 0,
          bottom: kb,
          padding: "0 12px calc(14px + env(safe-area-inset-bottom, 0px))",
          transition: "bottom 0.18s ease-out",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            maxWidth: 560,
            borderRadius: 24,
            overflow: "hidden",
            background: "rgba(18,16,20,0.5)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "0.5px solid rgba(255,255,255,0.16)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 16px 50px rgba(0,0,0,0.45)",
          }}
        >
          <div
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "show chat" : "hide chat — reveal the page"}
            style={{ display: "flex", justifyContent: "center", padding: "8px 0 2px", cursor: "pointer" }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.32)" }} />
          </div>
          <div
            ref={scrollerRef}
            style={{
              maxHeight: collapsed ? 0 : "30vh",
              overflowY: "auto",
              padding: collapsed ? "0 16px" : "8px 16px 6px",
              display: "grid",
              gap: 10,
              transition: "max-height .25s ease, padding .25s ease",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  justifySelf: m.role === "user" ? "end" : "start",
                  maxWidth: "86%",
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: m.role === "user" ? "#fff" : "rgba(255,255,255,0.92)",
                  background: m.role === "user" ? "rgba(255,255,255,0.16)" : "transparent",
                  padding: m.role === "user" ? "8px 12px" : "0 2px",
                  borderRadius: 16,
                }}
              >
                {m.content}
              </div>
            ))}
          </div>

          {pendingImage ? (
            <div style={{ padding: "0 14px 6px", display: "flex", alignItems: "center", gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage.preview} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover" }} />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>photo attached</span>
              <button onClick={() => { URL.revokeObjectURL(pendingImage.preview); setPendingImage(null); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}>
                remove
              </button>
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 10px 12px" }}>
            <IconBtn d={ICON.cam} label="add a photo" onClick={() => fileRef.current?.click()} />
            <IconBtn d={ICON.mic} label="speak" onClick={startMic} active={listening} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={busy ? "thinking…" : listening ? "listening…" : "tell Peek what to make…"}
              disabled={busy}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 16, fontFamily: "inherit" }}
            />
            <button
              onClick={() => void send()}
              disabled={busy || (!input.trim() && !pendingImage)}
              aria-label="send"
              style={{
                border: "none",
                cursor: busy || (!input.trim() && !pendingImage) ? "default" : "pointer",
                width: 38,
                height: 38,
                borderRadius: 999,
                background: (input.trim() || pendingImage) && !busy ? "#fff" : "rgba(255,255,255,0.2)",
                color: "#111",
                fontSize: 17,
                display: "grid",
                placeItems: "center",
              }}
            >
              ↑
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>peek.gift · the page builds as you talk</span>
        </div>
      </div>
    </div>
  );
}
