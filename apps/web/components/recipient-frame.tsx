"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders the recipient's published page in a hardened sandboxed iframe and
 * bridges it to the server: the runtime posts each pick (and the "send" action)
 * via postMessage; we POST /api/pick (server enforces rules/caps via decidePick)
 * and sync the authoritative pick-set back into the iframe so the two can never
 * disagree. The iframe has no `allow-same-origin`, so it cannot touch app cookies.
 */
export function RecipientFrame({ slug, srcDoc, title }: { slug: string; srcDoc: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const frame = ref.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const d = e.data as { source?: string; kind?: string; cardId?: string } | null;
      if (!d || d.source !== "peek") return;

      if (d.kind === "pick" && typeof d.cardId === "string") {
        const cardId = d.cardId;
        void (async () => {
          try {
            const res = await fetch("/api/pick", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ slug, cardId }),
            });
            const j = (await res.json().catch(() => ({}))) as { picks?: string[] };
            if (Array.isArray(j.picks)) {
              frame.contentWindow?.postMessage({ source: "peek-host", kind: "sync", picks: j.picks }, "*");
            }
          } catch {
            // offline / transient — leave the recipient's optimistic state as-is
          }
        })();
      } else if (d.kind === "action") {
        // "Send my picks" — picks are already persisted per-toggle; creator notify is wired separately.
        setSent(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug]);

  return (
    <>
      <iframe
        ref={ref}
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#0b0b0f" }}
      />
      {sent ? (
        <div
          role="status"
          style={{
            position: "fixed", left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom,0px))", zIndex: 10000,
            display: "grid", placeItems: "center", pointerEvents: "none",
          }}
        >
          <div style={{ background: "rgba(20,18,26,0.92)", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            sent — they&apos;ll be notified ✓
          </div>
        </div>
      ) : null}
    </>
  );
}
