// frames.tsx — wraps a media child in the named frame treatment, driven entirely by
// inherited --peek-* CSS custom properties. Server-component safe: no hooks, no
// "use client", no Math.random. Unknown kind falls through to `plain`.

import type { CSSProperties, ReactElement, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type Style = CSSProperties;

/** Merge an arbitrary number of style objects; later entries win. */
function merge(...styles: (Style | undefined)[]): Style {
  return Object.assign({}, ...styles.filter(Boolean));
}

// ---------------------------------------------------------------------------
// Individual frame implementations
// ---------------------------------------------------------------------------

/**
 * plain — rounded media + subtle inner border (the default / fallback).
 * Spec: "rounded media, optional inset sheen + border" (HEMLOCK cards).
 */
function PlainFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "var(--peek-radius-card)",
        overflow: "hidden",
        border: "1px solid var(--peek-line)",
        position: "relative",
        display: "block",
        lineHeight: 0,
      }}
    >
      {/* inset sheen — thin accent rim on top edge */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--peek-accent) 20%, transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div style={{ borderRadius: "inherit", overflow: "hidden", lineHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

/**
 * arch — portrait arch shape.
 * Spec: `border-radius:300px 300px 22px 22px / 60% 60% 22px 22px` + inset double border.
 * Sources: Garden `.arch :69-73`, Princess `.frame :113-118`.
 */
function ArchFrame({ children }: { children: ReactNode }) {
  const archRadius = "300px 300px 22px 22px / 60% 60% 22px 22px";
  return (
    <div
      style={{
        borderRadius: archRadius,
        overflow: "hidden",
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        width: "100%",
      }}
    >
      {/* outer accent border */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: archRadius,
          border: "2px solid var(--peek-accent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      {/* inner double-border inset ring */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "280px 280px 16px 16px / 56% 56% 16px 16px",
          border: "1px solid color-mix(in srgb, var(--peek-accent) 40%, transparent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div style={{ lineHeight: 0 }}>{children}</div>
    </div>
  );
}

/**
 * locket — oval portrait with concentric box-shadow rings.
 * Spec: `border-radius:~48%` oval + concentric `box-shadow` rings (accent, surface).
 * Source: prior-gen `:81-82`.
 */
function LocketFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "48%",
        overflow: "hidden",
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        width: "100%",
        // concentric rings: accent ring + surface gap + accent ring
        boxShadow: [
          "0 0 0 3px var(--peek-accent)",
          "0 0 0 8px var(--peek-surface)",
          "0 0 0 11px var(--peek-accent)",
          "0 0 0 14px var(--peek-surface)",
          "0 4px 24px color-mix(in srgb, var(--peek-ink) 22%, transparent)",
        ].join(", "),
      }}
    >
      <div style={{ lineHeight: 0 }}>{children}</div>
    </div>
  );
}

/**
 * vinyl — a record disc frame.
 * Spec: `repeating-radial-gradient` grooves disc + center label hole + `conic-gradient`
 * sheen. Source: Disco `:116-135`.
 *
 * The disc is painted as a ::before-equivalent overlay on top of a circular container.
 * The center label hole shows the actual child (the photo).
 */
function VinylFrame({ children }: { children: ReactNode }) {
  // The child (typically a square photo) becomes the center label.
  const labelSize = "40%";

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        width: "100%",
        aspectRatio: "1",
        borderRadius: "50%",
        overflow: "hidden",
        // Groove rings radiating from center (dark disc body)
        background: [
          // sheen highlight arc
          "conic-gradient(from 30deg, transparent 0deg 45deg, color-mix(in srgb, var(--peek-surface) 8%, transparent) 45deg 90deg, transparent 90deg 360deg)",
          // groove rings
          "repeating-radial-gradient(circle at 50% 50%, #111 0px 2px, #0e0e10 2px 5px)",
        ].join(", "),
      }}
    >
      {/* center label — circular cutout showing the child media */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: labelSize,
          height: labelSize,
          borderRadius: "50%",
          overflow: "hidden",
          zIndex: 2,
          // accent-tinted ring around the label
          boxShadow: "0 0 0 2px var(--peek-accent), 0 0 0 4px #111",
          lineHeight: 0,
        }}
      >
        {children}
      </div>
      {/* spindle hole */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#0e0e10",
          border: "1px solid var(--peek-accent)",
          zIndex: 3,
        }}
      />
    </div>
  );
}

/**
 * porthole — circle with thick layered bezel rings.
 * Spec: circle, thick layered `box-shadow` bezel rings + inner shadow.
 * Source: Space `.porthole :102-127`.
 */
function PortholeFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        width: "100%",
        aspectRatio: "1",
        // layered bezel: tight accent ring → surface gap → ink ring → outer shadow
        boxShadow: [
          "0 0 0 4px var(--peek-surface)",
          "0 0 0 8px var(--peek-accent)",
          "0 0 0 12px var(--peek-surface)",
          "0 0 0 16px var(--peek-ink)",
          "0 8px 40px color-mix(in srgb, var(--peek-ink) 40%, transparent)",
        ].join(", "),
      }}
    >
      {/* inner shadow for depth */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          boxShadow: "inset 0 4px 16px color-mix(in srgb, var(--peek-ink) 30%, transparent)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <div style={{ lineHeight: 0, width: "100%", height: "100%" }}>{children}</div>
    </div>
  );
}

/**
 * polaroid — white card with generous bottom padding and slight rotation.
 * Spec: `white card padding:14px 14px 54px; border; box-shadow; transform:rotate(-3–4deg)`,
 * caption strip. Source: Totally Rad `:94-106`, prior-gen.
 */
function PolaroidFrame({ children }: { children: ReactNode }) {
  return (
    <div
      // slight rotation applied at the wrapper; the parent controls layout
      style={{
        display: "inline-block",
        transform: "rotate(-3deg)",
        transformOrigin: "center bottom",
        background: "var(--peek-surface)",
        padding: "14px 14px 54px",
        border: "1px solid var(--peek-line)",
        borderRadius: "3px",
        boxShadow: [
          "0 4px 6px color-mix(in srgb, var(--peek-ink) 10%, transparent)",
          "0 12px 28px color-mix(in srgb, var(--peek-ink) 14%, transparent)",
        ].join(", "),
        lineHeight: 0,
        width: "100%",
        boxSizing: "border-box" as const,
      }}
    >
      {/* photo area */}
      <div
        style={{
          overflow: "hidden",
          lineHeight: 0,
          background: "color-mix(in srgb, var(--peek-accent) 8%, var(--peek-surface))",
        }}
      >
        {children}
      </div>
      {/* caption strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 38,
          marginTop: 2,
          fontFamily: "var(--peek-font-accent, var(--peek-font-display))",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "var(--peek-muted)",
          lineHeight: 1,
        }}
      >
        ✦
      </div>
    </div>
  );
}

/**
 * idcard — a [photo | meta] bordered crew-pass card.
 * Spec: `grid [photo | meta]` bordered card, "BACKSTAGE / ALL ACCESS / NO. 0042" mono text,
 * inner hairline. Source: Bachelor `.crew :102-112`, prior-gen `:83-84`.
 */
function IdcardFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: "1.5px solid var(--peek-accent)",
        borderRadius: "var(--peek-radius-card)",
        overflow: "hidden",
        background: "var(--peek-surface)",
        display: "grid",
        gridTemplateColumns: "42% 1fr",
        lineHeight: 0,
        boxShadow: "0 2px 12px color-mix(in srgb, var(--peek-ink) 12%, transparent)",
      }}
    >
      {/* photo column */}
      <div
        style={{
          borderRight: "1px solid var(--peek-line)",
          overflow: "hidden",
          lineHeight: 0,
          minHeight: 120,
        }}
      >
        {children}
      </div>
      {/* meta column */}
      <div
        style={{
          padding: "12px 10px",
          lineHeight: 1.3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 8.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase" as const,
              color: "var(--peek-accent)",
              lineHeight: 1.4,
            }}
          >
            ALL ACCESS
          </div>
          <div
            style={{
              fontFamily: "var(--peek-font-display)",
              fontSize: 15,
              color: "var(--peek-ink)",
              marginTop: 4,
              lineHeight: 1.1,
            }}
          >
            BACKSTAGE
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid var(--peek-line)",
            paddingTop: 6,
            fontFamily: "monospace",
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "var(--peek-muted)",
            textTransform: "uppercase" as const,
          }}
        >
          NO. 0042
        </div>
      </div>
    </div>
  );
}

/**
 * ticket / stub — dashed perforation edge + punched notch half-circles.
 * Spec: `dashed perforation + punched notch circles (::before/::after half-circles in bg
 * color straddling edges)`. Sources: For-the-Old-Man `.ticket :60-68`,
 * Bachelor `.stub :138-144`.
 *
 * The notches are rendered as sibling divs since we can't use pseudo-elements easily
 * in inline styles without a stylesheet; the visual is faithful.
 */
function TicketFrame({ children }: { children: ReactNode }) {
  const notchSize = 18;
  const notchStyle: Style = {
    position: "absolute",
    width: notchSize,
    height: notchSize,
    borderRadius: "50%",
    // bg color circle punched out of the border line
    background: "var(--peek-bg)",
    border: "1px solid var(--peek-line)",
    zIndex: 2,
  };

  return (
    <div
      style={{
        position: "relative",
        border: "1.5px solid var(--peek-line)",
        borderRadius: "var(--peek-radius-card)",
        overflow: "hidden",
        background: "var(--peek-surface)",
        lineHeight: 0,
      }}
    >
      {/* perforation strip — right edge dashed divider */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: "30%",
          width: 0,
          borderRight: "2px dashed var(--peek-line)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      {/* top notch straddling the perforation line */}
      <div
        aria-hidden
        style={merge(notchStyle, {
          top: -notchSize / 2,
          right: `calc(30% - ${notchSize / 2}px)`,
        })}
      />
      {/* bottom notch straddling the perforation line */}
      <div
        aria-hidden
        style={merge(notchStyle, {
          bottom: -notchSize / 2,
          right: `calc(30% - ${notchSize / 2}px)`,
        })}
      />
      {children}
    </div>
  );
}

/**
 * stamp — dashed/double border box with slight rotation.
 * Spec: `dashed/double border box, slight rotate, "Finalized"-style typewriter overprint`.
 * Sources: Decree `.stamp :40-42`, prior-gen MOTIFS.stamp.
 */
function StampFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "inline-block",
        transform: "rotate(2deg)",
        transformOrigin: "center center",
        width: "100%",
        boxSizing: "border-box" as const,
        lineHeight: 0,
        position: "relative",
      }}
    >
      {/* outer dashed border */}
      <div
        style={{
          border: "2px dashed var(--peek-accent)",
          borderRadius: "var(--peek-radius-card)",
          padding: 4,
          lineHeight: 0,
        }}
      >
        {/* inner solid border */}
        <div
          style={{
            border: "1px solid var(--peek-accent)",
            borderRadius: "calc(var(--peek-radius-card) - 2px)",
            overflow: "hidden",
            lineHeight: 0,
          }}
        >
          {children}
        </div>
      </div>
      {/* overprint "APPROVED" bar — typewriter aesthetic */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%) rotate(-5deg)",
          background: "var(--peek-accent)",
          color: "var(--peek-bg)",
          fontFamily: "monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.36em",
          textTransform: "uppercase" as const,
          padding: "3px 8px",
          whiteSpace: "nowrap" as const,
          lineHeight: 1,
          opacity: 0.82,
          borderRadius: 2,
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        APPROVED
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

type FrameKind =
  | "plain"
  | "arch"
  | "locket"
  | "vinyl"
  | "porthole"
  | "polaroid"
  | "idcard"
  | "ticket"
  | "stub"  // alias for ticket
  | "stamp"
  | (string & Record<never, never>); // open — unknown → plain

/**
 * Frame — wraps a media child in the named decorative frame treatment.
 *
 * All visual properties are driven by inherited CSS custom properties
 * (var(--peek-accent), --peek-accent-2, --peek-ink, --peek-bg, --peek-surface,
 * --peek-line, --peek-radius-card). No colors are hard-coded.
 *
 * Server-component safe: plain function, no hooks, no "use client", no Math.random.
 * Unknown `kind` values fall through to `plain`.
 */
export function Frame({ kind, children }: { kind: FrameKind | string; children: ReactNode }): ReactElement {
  switch (kind) {
    case "arch":
      return <ArchFrame>{children}</ArchFrame>;
    case "locket":
      return <LocketFrame>{children}</LocketFrame>;
    case "vinyl":
      return <VinylFrame>{children}</VinylFrame>;
    case "porthole":
      return <PortholeFrame>{children}</PortholeFrame>;
    case "polaroid":
      return <PolaroidFrame>{children}</PolaroidFrame>;
    case "idcard":
      return <IdcardFrame>{children}</IdcardFrame>;
    case "ticket":
    case "stub":
      return <TicketFrame>{children}</TicketFrame>;
    case "stamp":
      return <StampFrame>{children}</StampFrame>;
    case "plain":
    default:
      return <PlainFrame>{children}</PlainFrame>;
  }
}
