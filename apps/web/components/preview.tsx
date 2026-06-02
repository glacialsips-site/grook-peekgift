// The preview renderer: paints the core's framework-agnostic RenderModel into themed
// React, driven entirely by the --peek-* custom properties (no Tailwind). This is the
// "page that builds behind the chat" and the published recipient page — one renderer,
// one view-model. v1 covers hero / note / the rule-aware giftgrid / itinerary / the
// common section kinds + the money bar; richer shell (nav, bottom sheet, scenes, motion)
// is the Ch4 pass. Server-component safe (no hooks): it renders a snapshot of the model.

import type { CSSProperties, ReactNode } from "react";
import type {
  RenderModel,
  SectionView,
  CardView,
  CardGroupView,
  ItineraryStepView,
  VariantGroup,
} from "@peek/core";

function str(o: Record<string, unknown>, k: string): string | undefined {
  const v = o[k];
  return typeof v === "string" ? v : undefined;
}

function selectionLabel(sel: VariantGroup["selection"] | null): string {
  return sel === "pick_one" ? "pick one" : sel === "pick_any" ? "pick any" : sel === "pick_all" ? "pick all" : "";
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  // Deterministic (no locale/timezone) so server + client agree: trim the ISO string.
  return iso.replace("T", " · ").replace(/:\d{2}(\.\d+)?Z?$/, "").slice(0, 22);
}

function fmtTotal(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

function rootStyle(model: RenderModel): CSSProperties {
  return {
    ...(model.cssVars as unknown as CSSProperties),
    position: "relative",
    height: "100%",
    overflowY: "auto",
    background: "var(--peek-bg-wash)",
    color: "var(--peek-ink)",
    fontFamily: "var(--peek-font-body)",
    paddingBottom: 96,
  };
}

function Media({ url, alt, ratio = "4 / 3" }: { url: string | null; alt?: string; ratio?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt ?? ""} style={{ width: "100%", aspectRatio: ratio, objectFit: "cover", display: "block" }} />;
  }
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: ratio,
        background: "linear-gradient(135deg, var(--peek-accent), var(--peek-accent-2))",
        opacity: 0.92,
      }}
    />
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: "var(--peek-accent)",
        textTransform: "uppercase",
        letterSpacing: "var(--peek-eyebrow-tracking)",
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function Hero({ section, model }: { section: SectionView; model: RenderModel }) {
  const d = section.data;
  const headline = str(d, "headline") ?? model.occasion ?? model.recipientName ?? "A little something";
  const eyebrow = str(d, "eyebrow") ?? model.occasion ?? (model.recipientName ? `for ${model.recipientName}` : undefined);
  const dek = str(d, "dek") ?? str(d, "sub");
  return (
    <header style={{ padding: "26px 20px 10px" }}>
      {model.hero ? (
        <div style={{ borderRadius: "var(--peek-radius-lg)", overflow: "hidden", marginBottom: 18, border: "1px solid var(--peek-line)" }}>
          <Media url={model.hero.url} alt={model.hero.alt} ratio="16 / 10" />
        </div>
      ) : null}
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1
        style={{
          fontFamily: "var(--peek-font-display)",
          fontSize: "clamp(34px, 9vw, 52px)",
          lineHeight: 1.03,
          letterSpacing: "var(--peek-display-tracking)",
          textTransform: "var(--peek-display-case)" as CSSProperties["textTransform"],
          textShadow: "var(--peek-display-shadow)",
          whiteSpace: "pre-line",
          margin: "10px 0 8px",
        }}
      >
        {headline}
      </h1>
      {dek ? <p style={{ color: "var(--peek-muted)", fontSize: 16, lineHeight: 1.5, margin: 0 }}>{dek}</p> : null}
    </header>
  );
}

function Note({ section, model }: { section: SectionView; model: RenderModel }) {
  const body = model.noteMd ?? str(section.data, "body") ?? str(section.data, "quote");
  if (!body) return null;
  return (
    <section style={{ padding: "12px 20px" }}>
      <div
        style={{
          background: "var(--peek-accent-faint)",
          border: "1px solid var(--peek-line)",
          borderRadius: "var(--peek-radius-card)",
          padding: 20,
        }}
      >
        <Eyebrow>{str(section.data, "label") ?? "a note"}</Eyebrow>
        <p style={{ fontFamily: "var(--peek-font-accent)", fontSize: 18, lineHeight: 1.55, margin: "10px 0 0", whiteSpace: "pre-line" }}>
          {body}
        </p>
      </div>
    </section>
  );
}

function CardTile({ card }: { card: CardView }) {
  const dimmed = card.isTaunt;
  return (
    <div
      style={{
        background: "var(--peek-surface)",
        border: "var(--peek-border-weight) solid var(--peek-line)",
        borderRadius: "var(--peek-radius-card)",
        overflow: "hidden",
        boxShadow: "var(--peek-card-shadow)",
        opacity: dimmed ? 0.66 : 1,
        position: "relative",
      }}
    >
      {!card.isTaunt ? <Media url={card.media?.url ?? null} alt={card.media?.alt} /> : null}
      <div style={{ padding: 13 }}>
        {card.isLocked ? <Eyebrow>🔒 locked</Eyebrow> : null}
        <div style={{ fontFamily: "var(--peek-font-display)", fontSize: 16.5, lineHeight: 1.15, marginBottom: 4 }}>{card.title}</div>
        {card.description ? (
          <p style={{ color: "var(--peek-muted)", fontSize: 13, lineHeight: 1.45, margin: "0 0 8px" }}>{card.description}</p>
        ) : null}
        {card.isTaunt && card.tauntText ? (
          <div style={{ color: "var(--peek-accent)", fontStyle: "italic", fontSize: 13 }}>{card.tauntText}</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {card.valueText ? <span style={{ color: "var(--peek-accent)", fontWeight: 700 }}>{card.valueText}</span> : <span />}
            {!card.isLocked ? <span style={{ color: "var(--peek-muted)", fontSize: 12.5 }}>view →</span> : null}
          </div>
        )}
        {card.isLocked && card.unlockRule?.kind === "beg" && card.unlockRule.beg_prompt ? (
          <div style={{ color: "var(--peek-muted)", fontSize: 12.5, marginTop: 6 }}>“{card.unlockRule.beg_prompt}”</div>
        ) : null}
      </div>
    </div>
  );
}

// gap-a made visible: a variant group renders as a labeled, ruled cluster carrying its
// selection rule; ungrouped cards stand alone. Never flat uniform tiles with one badge.
function GiftGrid({ groups }: { groups: CardGroupView[] }) {
  if (groups.length === 0) return null;
  return (
    <section style={{ display: "grid", gap: 16, padding: "8px 20px" }}>
      {groups.map((g, i) =>
        g.group ? (
          <fieldset
            key={g.group.id}
            style={{ border: "1px dashed var(--peek-line)", borderRadius: "var(--peek-radius-card)", padding: "8px 12px 14px", margin: 0 }}
          >
            <legend style={{ padding: "0 8px" }}>
              <Eyebrow>
                {g.group.title} · {selectionLabel(g.selection)}
              </Eyebrow>
            </legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {g.cards.map((c) => (
                <CardTile key={c.id} card={c} />
              ))}
            </div>
          </fieldset>
        ) : (
          <CardTile key={g.cards[0]?.id ?? `solo-${i}`} card={g.cards[0]!} />
        ),
      )}
    </section>
  );
}

// gap-b made visible: activity cards render as a timeline/itinerary with a node spine.
function Itinerary({ steps }: { steps: ItineraryStepView[] }) {
  if (steps.length === 0) return null;
  return (
    <section style={{ padding: "12px 20px" }}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {steps.map((s) => (
          <li key={s.cardId} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, paddingBottom: 16 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid var(--peek-accent)",
                boxShadow: "0 0 0 4px var(--peek-bg)",
                marginTop: 5,
              }}
            />
            <div>
              {fmtDate(s.date) ? <div style={{ color: "var(--peek-accent)", fontSize: 12 }}>{fmtDate(s.date)}</div> : null}
              <div style={{ fontFamily: "var(--peek-font-display)", fontSize: 17 }}>{s.title}</div>
              {s.place ? <div style={{ color: "var(--peek-muted)", fontSize: 13 }}>{s.place}</div> : null}
              {s.description ? <p style={{ color: "var(--peek-muted)", fontSize: 13, margin: "4px 0 0" }}>{s.description}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GenericSection({ section }: { section: SectionView }) {
  const d = section.data;
  const rows = Array.isArray(d.rows) ? (d.rows as unknown[]) : null;
  const steps = Array.isArray(d.steps) ? (d.steps as unknown[]) : null;
  const items = Array.isArray(d.items) ? (d.items as unknown[]) : null;
  const quote = str(d, "quote");
  const hasContent = section.title || rows || steps || items || quote;
  if (!hasContent) return null;
  return (
    <section style={{ padding: "16px 20px" }}>
      {section.title ? (
        <h2 style={{ fontFamily: "var(--peek-font-display)", fontSize: 22, margin: "0 0 12px", textShadow: "var(--peek-display-shadow)" }}>
          {section.title}
        </h2>
      ) : null}
      {quote ? <p style={{ fontFamily: "var(--peek-font-accent)", fontSize: 19, lineHeight: 1.5, margin: 0 }}>“{quote}”</p> : null}
      {items ? (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {items.map((it, i) => {
            const o = (it ?? {}) as Record<string, unknown>;
            return (
              <div key={i}>
                <div style={{ fontFamily: "var(--peek-font-display)", fontSize: 30, color: "var(--peek-accent)" }}>
                  {str(o, "pre") ?? ""}
                  {String(o.value ?? "")}
                  {str(o, "suf") ?? ""}
                </div>
                <div style={{ color: "var(--peek-muted)", fontSize: 13 }}>{str(o, "label")}</div>
              </div>
            );
          })}
        </div>
      ) : null}
      {rows ? (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r, i) => {
            const pair = Array.isArray(r) ? (r as unknown[]) : [];
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--peek-line)", paddingBottom: 6 }}>
                <Eyebrow>{String(pair[0] ?? "")}</Eyebrow>
                <span style={{ fontFamily: "var(--peek-font-display)" }}>{String(pair[1] ?? "")}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {steps ? (
        <ol style={{ display: "grid", gap: 10, paddingLeft: 0, listStyle: "none", margin: 0 }}>
          {steps.map((st, i) => {
            const pair = Array.isArray(st) ? (st as unknown[]) : [st];
            return (
              <li key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "baseline" }}>
                <span style={{ color: "var(--peek-accent)", fontFamily: "var(--peek-font-display)", fontSize: 20 }}>{String(pair[0] ?? i + 1)}</span>
                <span>{String(pair[1] ?? pair[0] ?? "")}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

function ActionBar({ model }: { model: RenderModel }) {
  const total = model.totalValueCents > 0 ? fmtTotal(model.totalValueCents) : null;
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px calc(12px + var(--peek-safe-b))",
        background: "color-mix(in srgb, var(--peek-bg) 88%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--peek-line)",
      }}
    >
      <div style={{ flex: 1 }}>
        <Eyebrow>{total ? "in the bundle" : "your move"}</Eyebrow>
        <div style={{ fontFamily: "var(--peek-font-display)", fontSize: 18 }}>{total ?? "pick what speaks to you"}</div>
      </div>
      <button
        style={{
          border: "none",
          cursor: "pointer",
          background: "var(--peek-accent)",
          color: "var(--peek-btn-ink)",
          fontFamily: "var(--peek-font-display)",
          fontSize: 15,
          padding: "12px 20px",
          borderRadius: "var(--peek-radius-pill)",
          boxShadow: "var(--peek-glow)",
        }}
      >
        {model.ctaLabel ?? "Pick yours →"}
      </button>
    </div>
  );
}

function SectionBlock({ section, model }: { section: SectionView; model: RenderModel }) {
  switch (section.kind) {
    case "hero":
      return <Hero section={section} model={model} />;
    case "note":
      return <Note section={section} model={model} />;
    case "giftgrid":
      return <GiftGrid groups={model.cardGroups} />;
    case "flightplan":
      return model.itinerary.length > 0 ? <Itinerary steps={model.itinerary} /> : <GenericSection section={section} />;
    default:
      return <GenericSection section={section} />;
  }
}

export function PeekPreview({ model }: { model: RenderModel }) {
  const hasGiftgrid = model.sections.some((s) => s.kind === "giftgrid");
  return (
    <div style={rootStyle(model)} data-peek-mode={model.mode}>
      {model.sections.map((s) => (
        <SectionBlock key={s.id} section={s} model={model} />
      ))}
      {/* If cards exist but no giftgrid section declared them, still surface them. */}
      {!hasGiftgrid && model.cardGroups.length > 0 ? <GiftGrid groups={model.cardGroups} /> : null}
      <ActionBar model={model} />
    </div>
  );
}
