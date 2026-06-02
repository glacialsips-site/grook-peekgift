"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { emptyDocument, render, validatePeekIR, type PeekIR } from "@peek/core";
import { PeekPreview } from "@/components/preview";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "hey — who are we making something for? give me the person + the occasion in a line, however sloppy. a url, a photo, or a voice note works too.";

function newPeekId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `peek-${Math.random().toString(36).slice(2, 12)}`;
}

export default function Studio() {
  const [doc, setDoc] = useState<PeekIR>(() => {
    const id = newPeekId();
    return emptyDocument({ id, slug: id.slice(0, 8), curator_id: "anon" });
  });
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [kb, setKb] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc, messages: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { doc?: unknown; text?: string; error?: string };
      if (res.status === 503) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "(the curator model isn't keyed here yet — set ANTHROPIC_API_KEY. everything else is live.)" },
        ]);
        return;
      }
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `(error: ${data.error ?? res.status})` }]);
        return;
      }
      if (data.doc) {
        const v = validatePeekIR(data.doc);
        if (v.ok) setDoc(v.value);
      }
      setMessages((m) => [...m, { role: "assistant", content: data.text?.trim() || "(updated the page)" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "(network hiccup — try again)" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <PeekPreview model={model} />
      </div>

      <div
        style={{
          position: "absolute",
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
          <div ref={scrollerRef} style={{ maxHeight: "32vh", overflowY: "auto", padding: "14px 16px 6px", display: "grid", gap: 10 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 10px 14px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={busy ? "thinking…" : "tell Claude what to make…"}
              disabled={busy}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 16, fontFamily: "inherit" }}
            />
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="send"
              style={{
                border: "none",
                cursor: busy || !input.trim() ? "default" : "pointer",
                width: 38,
                height: 38,
                borderRadius: 999,
                background: input.trim() && !busy ? "#fff" : "rgba(255,255,255,0.2)",
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
