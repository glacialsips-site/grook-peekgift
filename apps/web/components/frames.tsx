import type { CSSProperties, ReactElement, ReactNode } from "react";


type Style = CSSProperties;

function merge(...styles: (Style | undefined)[]): Style {
  return Object.assign({}, ...styles.filter(Boolean));
}


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

function VinylFrame({ children }: { children: ReactNode }) {
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
        background: [
          "conic-gradient(from 30deg, transparent 0deg 45deg, color-mix(in srgb, var(--peek-surface) 8%, transparent) 45deg 90deg, transparent 90deg 360deg)",
          "repeating-radial-gradient(circle at 50% 50%, #111 0px 2px, #0e0e10 2px 5px)",
        ].join(", "),
      }}
    >
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
          boxShadow: "0 0 0 2px var(--peek-accent), 0 0 0 4px #111",
          lineHeight: 0,
        }}
      >
        {children}
      </div>
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
        boxShadow: [
          "0 0 0 4px var(--peek-surface)",
          "0 0 0 8px var(--peek-accent)",
          "0 0 0 12px var(--peek-surface)",
          "0 0 0 16px var(--peek-ink)",
          "0 8px 40px color-mix(in srgb, var(--peek-ink) 40%, transparent)",
        ].join(", "),
      }}
    >
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

function PolaroidFrame({ children }: { children: ReactNode }) {
  return (
    <div
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
      <div
        style={{
          overflow: "hidden",
          lineHeight: 0,
          background: "color-mix(in srgb, var(--peek-accent) 8%, var(--peek-surface))",
        }}
      >
        {children}
      </div>
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

function TicketFrame({ children }: { children: ReactNode }) {
  const notchSize = 18;
  const notchStyle: Style = {
    position: "absolute",
    width: notchSize,
    height: notchSize,
    borderRadius: "50%",
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
      <div
        aria-hidden
        style={merge(notchStyle, {
          top: -notchSize / 2,
          right: `calc(30% - ${notchSize / 2}px)`,
        })}
      />
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
      <div
        style={{
          border: "2px dashed var(--peek-accent)",
          borderRadius: "var(--peek-radius-card)",
          padding: 4,
          lineHeight: 0,
        }}
      >
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


type FrameKind =
  | "plain"
  | "arch"
  | "locket"
  | "vinyl"
  | "porthole"
  | "polaroid"
  | "idcard"
  | "ticket"
  | "stub"
  | "stamp"
  | (string & Record<never, never>);

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
