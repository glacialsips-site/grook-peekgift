"use client";

// The gift page, rendered live from page state. Themed entirely from page.theme
// (inline styles, since the palette is dynamic), so it restyles instantly when
// Peek changes the theme — and is straightforward to reskin to a real mockup.

import type { CardRule, GiftCard, GiftPage } from "../../lib/peek/types";

const TYPE_LABEL: Record<GiftCard["type"], string> = {
  product: "Gift",
  activity: "Experience",
  aspirational: "Someday",
  digital: "Digital",
};

function ruleBadge(rule: CardRule): string | null {
  switch (rule.kind) {
    case "pick_one_of":
      return `Pick one · ${rule.group}`;
    case "beg_to_unlock":
      return "Locked — ask to unlock";
    case "decorative_taunt":
      return "Just a tease";
    default:
      return null;
  }
}

export default function GiftPagePreview({ page }: { page: GiftPage }) {
  const { theme, recipient, cards } = page;
  const serif = 'Georgia, "Times New Roman", serif';

  return (
    <div style={{ height: "100%", overflowY: "auto", background: theme.bg, color: theme.text }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 32px 80px" }}>
        <div style={{ textTransform: "uppercase", letterSpacing: 3, fontSize: 11, opacity: 0.6 }}>
          {recipient.occasion || "A gift, just for you"}
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 44, lineHeight: 1.05, margin: "10px 0 0" }}>
          {recipient.name ? `For ${recipient.name}` : "For someone in particular"}
        </h1>
        {(recipient.relationship || recipient.notes) && (
          <p style={{ marginTop: 12, opacity: 0.7, maxWidth: 520 }}>
            {[recipient.relationship, recipient.notes].filter(Boolean).join(" · ")}
          </p>
        )}
        <div
          style={{
            marginTop: 18,
            display: "inline-block",
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
          }}
        >
          {theme.name}
        </div>

        {cards.length === 0 ? (
          <div style={{ marginTop: 48, opacity: 0.55, fontFamily: serif, fontSize: 18 }}>
            Your gift page builds itself here as you and Peek talk.
          </div>
        ) : (
          <div style={{ marginTop: 36, display: "grid", gap: 16 }}>
            {cards.map((card) => {
              const badge = ruleBadge(card.rule);
              const taunt = card.rule.kind === "decorative_taunt";
              return (
                <div
                  key={card.id}
                  style={{
                    background: theme.surface,
                    borderRadius: 14,
                    padding: "18px 20px",
                    borderLeft: `3px solid ${theme.accent}`,
                    opacity: taunt ? 0.6 : 1,
                    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: 10, opacity: 0.6 }}>
                      {TYPE_LABEL[card.type]}
                    </span>
                    {card.price && <span style={{ fontSize: 13, opacity: 0.8 }}>{card.price}</span>}
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 22, marginTop: 6 }}>{card.title}</div>
                  {card.description && (
                    <p style={{ margin: "6px 0 0", opacity: 0.75, fontSize: 14 }}>{card.description}</p>
                  )}
                  {badge && (
                    <div
                      style={{
                        marginTop: 12,
                        display: "inline-block",
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: theme.accent,
                        color: theme.bg,
                      }}
                    >
                      {badge}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
