"use client";

import { useMemo, useState } from "react";
import { render, type PeekIR } from "@peek/core";
import { PeekPreview, type PickInteraction } from "@/components/preview";

export function RecipientView({ doc, initialPicks }: { doc: PeekIR; initialPicks: string[] }) {
  const [picked, setPicked] = useState<string[]>(initialPicks);
  const [pending, setPending] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const model = useMemo(() => render(doc), [doc]);

  async function onToggle(cardId: string) {
    if (pending) return;
    setPending(true);
    setWarn(null);
    try {
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: doc.peek.slug, cardId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        picks?: string[];
        error?: string;
        overSoftCap?: boolean;
      };
      if (res.ok && Array.isArray(data.picks)) {
        setPicked(data.picks);
        if (data.overSoftCap) setWarn("heads up — that's over the suggested amount");
      } else if (res.status === 409) {
        setWarn(data.error ?? "that one isn't available right now");
      } else if (!res.ok) {
        setWarn(data.error ?? "couldn't save that pick");
      }
    } catch {
      setWarn("network hiccup — try again");
    } finally {
      setPending(false);
    }
  }

  const interaction: PickInteraction = { picked, onToggle, pending };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <PeekPreview model={model} interaction={interaction} />
      {warn ? (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 86, textAlign: "center", pointerEvents: "none", zIndex: 10 }}>
          <span style={{ background: "rgba(0,0,0,0.82)", color: "#fff", padding: "7px 16px", borderRadius: 999, fontSize: 13 }}>{warn}</span>
        </div>
      ) : null}
    </div>
  );
}
