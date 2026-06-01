"use client";

// The in-site Peek chat: conversation on the left, the gift page building live on
// the right. Consumes the SSE stream from /api/peek. Skin is a tasteful default —
// the structure (chat + live preview) is the point; restyle freely.

import { useCallback, useEffect, useRef, useState } from "react";
import GiftPagePreview from "./GiftPagePreview";
import { emptyPage } from "../../lib/peek/types";
import type { ChatMessage, GiftPage, PeekEvent } from "../../lib/peek/types";

const GREETING =
  "Hi — I'm Peek. Tell me who we're making a gift page for, and we'll build it together. Who is it for?";

export default function PeekChat({
  initialPage,
  initialMessages,
}: {
  initialPage?: GiftPage;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages ?? [{ role: "assistant", content: GREETING }],
  );
  const [page, setPage] = useState<GiftPage>(initialPage ?? emptyPage());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");

    const convo: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...convo, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/peek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convo, page }),
      });
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const apply = (evt: PeekEvent) => {
        if (evt.type === "text") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + evt.text };
            return next;
          });
        } else if (evt.type === "page") {
          setPage(evt.page);
        } else if (evt.type === "notice") {
          setNotice(evt.text);
        } else if (evt.type === "error") {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: `⚠ ${evt.message}` };
            return next;
          });
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (line) apply(JSON.parse(line.slice(6)) as PeekEvent);
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: `⚠ ${err instanceof Error ? err.message : "Something went wrong."}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages, page]);

  const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: sans, color: "#2A2622" }}>
      {/* Chat column */}
      <div style={{ width: "42%", minWidth: 380, display: "flex", flexDirection: "column", borderRight: "1px solid #E7E2D8", background: "#FBFAF7" }}>
        <header style={{ padding: "18px 22px", borderBottom: "1px solid #E7E2D8" }}>
          <div style={{ fontWeight: 700, letterSpacing: -0.3 }}>peek.gift</div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>chatting with Peek</div>
        </header>

        {notice && (
          <div style={{ padding: "8px 22px", fontSize: 12, background: "#FBF0E2", color: "#9A5A24", borderBottom: "1px solid #F0E2CE" }}>
            {notice}
          </div>
        )}

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div
                style={{
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: 16,
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  background: m.role === "user" ? "#2A2622" : "#FFFFFF",
                  color: m.role === "user" ? "#F4F1EA" : "#2A2622",
                  border: m.role === "user" ? "none" : "1px solid #ECE7DD",
                }}
              >
                {m.content || (busy ? "…" : "")}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid #E7E2D8", display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tell Peek who it's for…"
            disabled={busy}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid #DCD6C9", fontSize: 14.5, outline: "none", background: "#fff" }}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            style={{
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: busy || !input.trim() ? "#C9C2B4" : "#C2683F",
              color: "#fff",
              fontWeight: 600,
              cursor: busy || !input.trim() ? "default" : "pointer",
            }}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>

      {/* Live preview column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <GiftPagePreview page={page} />
      </div>
    </div>
  );
}
