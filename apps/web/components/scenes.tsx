import React, { type JSX } from "react";


export interface SceneProps {
  kind: string;
  mode: "light" | "dark";
  intensity?: number;
}

export function Scene({
  kind,
  mode,
  intensity = 0.5,
}: SceneProps): JSX.Element | null {
  const wrap: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    overflow: "hidden",
  };

  const animate = intensity > 0;

  switch (kind) {
    case "none":
      return null;

    case "grain":
      return <GrainScene wrap={wrap} mode={mode} />;

    case "rayfan":
      return <RayfanScene wrap={wrap} mode={mode} />;

    case "sunburst":
      return <SunburstScene wrap={wrap} mode={mode} />;

    case "starfield":
      return <StarfieldScene wrap={wrap} animate={animate} />;

    case "gridfloor":
      return <GridfloorScene wrap={wrap} animate={animate} />;

    case "mirrorball":
      return <MirrorballScene wrap={wrap} animate={animate} />;

    case "confetti":
      return <ConfettiScene wrap={wrap} animate={animate} />;

    case "bubbles":
      return <BubblesScene wrap={wrap} animate={animate} />;

    case "halftone":
      return <HalftoneScene wrap={wrap} mode={mode} />;

    case "blueprint":
      return <BlueprintScene wrap={wrap} />;

    case "topo":
      return <TopoScene wrap={wrap} mode={mode} />;

    case "mesh":
      return <MeshScene wrap={wrap} animate={animate} />;

    case "scanlines":
      return <ScanlinesScene wrap={wrap} mode={mode} />;

    default:
      return null;
  }
}


function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function makeRng(seed: string): () => number {
  let state = hashStr(seed) >>> 0 || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}


function Styles({ css }: { css: string }): JSX.Element {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}



function GrainScene({
  wrap,
  mode,
}: {
  wrap: React.CSSProperties;
  mode: "light" | "dark";
}): JSX.Element {
  const svgNoise = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(#n)' opacity='1'/></svg>`;
  const encoded = encodeURIComponent(svgNoise);
  const blendMode = mode === "dark" ? "overlay" : "multiply";

  return (
    <div
      style={{
        ...wrap,
        backgroundImage: `url("data:image/svg+xml,${encoded}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        opacity: 0.06,
        mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
      }}
      aria-hidden="true"
    />
  );
}


function RayfanScene({
  wrap,
  mode: _mode,
}: {
  wrap: React.CSSProperties;
  mode: "light" | "dark";
}): JSX.Element {
  return (
    <div
      style={{
        ...wrap,
        background:
          "repeating-conic-gradient(from 0deg at 50% 100%, var(--peek-accent) 0deg 6deg, transparent 6deg 12deg)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 60% at 50% 100%, black 30%, transparent 80%)",
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 100%, black 30%, transparent 80%)",
        opacity: 0.18,
      }}
      aria-hidden="true"
    />
  );
}


function SunburstScene({
  wrap,
  mode: _mode,
}: {
  wrap: React.CSSProperties;
  mode: "light" | "dark";
}): JSX.Element {
  return (
    <div
      style={{
        ...wrap,
        background:
          "repeating-conic-gradient(from 0deg at 50% 50%, var(--peek-accent) 0deg 8deg, var(--peek-accent-2) 8deg 16deg)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 75%)",
        maskImage:
          "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 75%)",
        opacity: 0.15,
      }}
      aria-hidden="true"
    />
  );
}


function buildStarShadows(
  seed: string,
  count: number,
  areaW: number,
  areaH: number,
  alphaMin: number,
  alphaMax: number
): string {
  const rng = makeRng(seed);
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * areaW);
    const y = Math.floor(rng() * areaH);
    const alpha = alphaMin + rng() * (alphaMax - alphaMin);
    const size = rng() < 0.15 ? 2 : 1;
    shadows.push(
      `${x}px ${y}px 0 ${size > 1 ? `${size}px` : "0"} rgba(255,255,255,${alpha.toFixed(2)})`
    );
  }
  return shadows.join(",");
}

function StarfieldScene({
  wrap,
  animate,
}: {
  wrap: React.CSSProperties;
  animate: boolean;
}): JSX.Element {
  const layer1 = buildStarShadows("starfield-l1", 120, 1440, 900, 0.35, 0.7);
  const layer2 = buildStarShadows("starfield-l2", 80, 1440, 900, 0.2, 0.55);
  const layer3 = buildStarShadows("starfield-l3", 40, 1440, 900, 0.5, 1.0);

  const keyframes = `
@keyframes peek-twinkle {
  0%,100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
@keyframes peek-twinkle2 {
  0%,100% { opacity: 0.2; }
  50%      { opacity: 0.8; }
}
@keyframes peek-twinkle3 {
  0%,100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .peek-stars-l1, .peek-stars-l2, .peek-stars-l3 {
    animation: none !important;
  }
}`;

  const animCss = animate
    ? {
        l1: "peek-twinkle 4s ease-in-out infinite",
        l2: "peek-twinkle2 6s ease-in-out infinite 1s",
        l3: "peek-twinkle3 3s ease-in-out infinite 0.5s",
      }
    : { l1: "none", l2: "none", l3: "none" };

  return (
    <div style={wrap} aria-hidden="true">
      <Styles css={keyframes} />
      <div
        className="peek-stars-l1"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(10,10,30,0.85) 0%, transparent 70%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            boxShadow: layer1,
            animation: animCss.l1,
          }}
        />
      </div>
      <div
        className="peek-stars-l2"
        style={{
          position: "absolute",
          inset: 0,
          transform: "scale(1.05)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            boxShadow: layer2,
            animation: animCss.l2,
          }}
        />
      </div>
      <div
        className="peek-stars-l3"
        style={{
          position: "absolute",
          inset: 0,
          transform: "scale(1.1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            boxShadow: layer3,
            animation: animCss.l3,
          }}
        />
      </div>
    </div>
  );
}


function GridfloorScene({
  wrap,
  animate,
}: {
  wrap: React.CSSProperties;
  animate: boolean;
}): JSX.Element {
  const id = "peek-gridfloor";

  const keyframes = `
@keyframes ${id}-scroll {
  from { background-position: 0 0, 0 0; }
  to   { background-position: 50px 0, 0 50px; }
}
@media (prefers-reduced-motion: reduce) {
  .${id}-inner { animation: none !important; }
}`;

  return (
    <div
      style={{
        ...wrap,
        top: "45%",
        perspective: "340px",
      }}
      aria-hidden="true"
    >
      <Styles css={keyframes} />
      <div
        className={`${id}-inner`}
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "bottom center",
          transform: "rotateX(72deg)",
          backgroundImage: [
            "linear-gradient(90deg, var(--peek-accent) 1px, transparent 1px)",
            "linear-gradient(0deg, var(--peek-accent) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "50px 50px",
          opacity: 0.18,
          animation: animate
            ? `${id}-scroll 4s linear infinite`
            : "none",
          WebkitMaskImage:
            "linear-gradient(to top, black 0%, transparent 80%)",
          maskImage:
            "linear-gradient(to top, black 0%, transparent 80%)",
        }}
      />
    </div>
  );
}


function MirrorballScene({
  wrap,
  animate,
}: {
  wrap: React.CSSProperties;
  animate: boolean;
}): JSX.Element {
  const id = "peek-mirrorball";

  const keyframes = `
@keyframes ${id}-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .${id}-disc { animation: none !important; }
}`;

  const ballSize = 260;
  const half = ballSize / 2;

  return (
    <div
      style={{
        ...wrap,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.55,
      }}
      aria-hidden="true"
    >
      <Styles css={keyframes} />
      <div
        style={{
          position: "relative",
          width: ballSize,
          height: ballSize,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, var(--peek-accent) 30%, rgba(0,0,0,0.85) 100%)`,
          }}
        />
        <div
          className={`${id}-disc`}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            backgroundImage: [
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 10px)",
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 10px)",
            ].join(", "),
            mixBlendMode: "overlay",
            animation: animate
              ? `${id}-spin 8s linear infinite`
              : "none",
            overflow: "hidden",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: half * 0.12,
            left: half * 0.22,
            width: half * 0.35,
            height: half * 0.35,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)",
          }}
        />
        {[
          { top: "10%", left: "70%", size: 6, alpha: 0.7 },
          { top: "25%", left: "15%", size: 4, alpha: 0.5 },
          { top: "65%", left: "80%", size: 5, alpha: 0.6 },
          { top: "80%", left: "25%", size: 3, alpha: 0.4 },
          { top: "45%", left: "88%", size: 4, alpha: 0.55 },
          { top: "15%", left: "45%", size: 3, alpha: 0.45 },
        ].map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: r.top,
              left: r.left,
              width: r.size,
              height: r.size,
              borderRadius: "50%",
              background: `rgba(255,255,255,${r.alpha})`,
              boxShadow: `0 0 ${r.size * 2}px rgba(255,255,255,${r.alpha})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}


function buildConfettiPieces(
  count: number
): Array<{
  left: string;
  delay: string;
  dur: string;
  size: number;
  color: string;
  rotate: number;
  aspect: "wide" | "square";
}> {
  const rng = makeRng("confetti");
  const colorVars = [
    "var(--peek-accent)",
    "var(--peek-accent-2)",
    "var(--peek-ink)",
    "var(--peek-bg)",
  ];
  return Array.from({ length: count }, (_, i) => {
    void i;
    return {
      left: `${(rng() * 100).toFixed(1)}%`,
      delay: `${(rng() * 6).toFixed(2)}s`,
      dur: `${(4 + rng() * 5).toFixed(1)}s`,
      size: 6 + Math.floor(rng() * 8),
      color: colorVars[Math.floor(rng() * colorVars.length)],
      rotate: Math.floor(rng() * 360),
      aspect: rng() > 0.5 ? "wide" : "square",
    };
  });
}

function ConfettiScene({
  wrap,
  animate,
}: {
  wrap: React.CSSProperties;
  animate: boolean;
}): JSX.Element {
  const pieces = buildConfettiPieces(40);

  const keyframes = `
@keyframes peek-confetti-fall {
  0%   { transform: translateY(-20px) rotate(var(--cr)); opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(110vh) rotate(calc(var(--cr) + 720deg)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .peek-confetti-piece { animation: none !important; opacity: 0.25; }
}`;

  return (
    <div style={{ ...wrap, opacity: 0.65 }} aria-hidden="true">
      <Styles css={keyframes} />
      {pieces.map((p, i) => (
        <div
          key={i}
          className="peek-confetti-piece"
          style={{
            position: "absolute",
            top: "-20px",
            left: p.left,
            width: p.aspect === "wide" ? p.size * 2 : p.size,
            height: p.size,
            background: p.color,
            borderRadius: 2,
            ["--cr" as string]: `${p.rotate}deg`,
            animation: animate
              ? `peek-confetti-fall ${p.dur} linear ${p.delay} infinite`
              : "none",
            transform: animate ? undefined : `rotate(${p.rotate}deg)`,
            opacity: animate ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}


function buildBubbles(
  count: number
): Array<{
  left: string;
  bottom: string;
  size: number;
  delay: string;
  dur: string;
}> {
  const rng = makeRng("bubbles");
  return Array.from({ length: count }, (_, i) => {
    void i;
    return {
      left: `${(rng() * 95).toFixed(1)}%`,
      bottom: `${(rng() * 20).toFixed(1)}%`,
      size: 12 + Math.floor(rng() * 36),
      delay: `${(rng() * 8).toFixed(2)}s`,
      dur: `${(5 + rng() * 7).toFixed(1)}s`,
    };
  });
}

function BubblesScene({
  wrap,
  animate,
}: {
  wrap: React.CSSProperties;
  animate: boolean;
}): JSX.Element {
  const bubbles = buildBubbles(25);

  const keyframes = `
@keyframes peek-bubble-rise {
  0%   { transform: translateY(0) scale(1); opacity: 0.6; }
  80%  { opacity: 0.4; }
  100% { transform: translateY(-110vh) scale(0.6); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .peek-bubble { animation: none !important; opacity: 0.15; }
}`;

  return (
    <div style={{ ...wrap, opacity: 0.55 }} aria-hidden="true">
      <Styles css={keyframes} />
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="peek-bubble"
          style={{
            position: "absolute",
            left: b.left,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            border: "1.5px solid var(--peek-accent)",
            background: "rgba(255,255,255,0.04)",
            animation: animate
              ? `peek-bubble-rise ${b.dur} ease-in ${b.delay} infinite`
              : "none",
            opacity: animate ? 0.6 : 0.15,
          }}
        />
      ))}
    </div>
  );
}


function HalftoneScene({
  wrap,
  mode,
}: {
  wrap: React.CSSProperties;
  mode: "light" | "dark";
}): JSX.Element {
  const dotAlpha = mode === "dark" ? 0.18 : 0.12;

  return (
    <div
      style={{
        ...wrap,
        backgroundImage: `radial-gradient(circle, var(--peek-ink) 1.4px, transparent 1.6px)`,
        backgroundSize: "12px 12px",
        opacity: dotAlpha,
      }}
      aria-hidden="true"
    />
  );
}


function BlueprintScene({
  wrap,
}: {
  wrap: React.CSSProperties;
}): JSX.Element {
  return (
    <div
      style={{
        ...wrap,
        backgroundImage: [
          "linear-gradient(var(--peek-accent) 1px, transparent 1px)",
          "linear-gradient(90deg, var(--peek-accent) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "28px 28px",
        opacity: 0.09,
      }}
      aria-hidden="true"
    />
  );
}


function TopoScene({
  wrap,
  mode: _mode,
}: {
  wrap: React.CSSProperties;
  mode: "light" | "dark";
}): JSX.Element {
  return (
    <div
      style={{
        ...wrap,
        backgroundImage:
          "repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 18px, var(--peek-ink) 18px, var(--peek-ink) 19px)",
        opacity: 0.06,
      }}
      aria-hidden="true"
    />
  );
}


function MeshScene({
  wrap,
  animate,
}: {
  wrap: React.CSSProperties;
  animate: boolean;
}): JSX.Element {
  const id = "peek-mesh";

  const keyframes = `
@keyframes ${id}-drift {
  0%   { background-position: 0% 0%, 100% 100%, 50% 50%; }
  33%  { background-position: 30% 60%, 70% 30%, 20% 80%; }
  66%  { background-position: 70% 20%, 20% 70%, 80% 30%; }
  100% { background-position: 0% 0%, 100% 100%, 50% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .${id} { animation: none !important; }
}`;

  return (
    <div
      className={id}
      style={{
        ...wrap,
        backgroundImage: [
          "radial-gradient(ellipse 60% 50% at 20% 30%, var(--peek-accent), transparent 70%)",
          "radial-gradient(ellipse 50% 60% at 80% 70%, var(--peek-accent-2), transparent 70%)",
          "radial-gradient(ellipse 40% 40% at 50% 50%, var(--peek-bg), transparent 60%)",
        ].join(", "),
        backgroundSize: "100% 100%",
        opacity: 0.45,
        animation: animate
          ? `${id}-drift 18s ease-in-out infinite`
          : "none",
      }}
      aria-hidden="true"
    >
      <Styles css={keyframes} />
    </div>
  );
}


function ScanlinesScene({
  wrap,
  mode,
}: {
  wrap: React.CSSProperties;
  mode: "light" | "dark";
}): JSX.Element {
  const alpha = mode === "dark" ? 0.22 : 0.1;

  return (
    <div
      style={{
        ...wrap,
        backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 2px, rgba(0,0,0,${alpha}) 2px, rgba(0,0,0,${alpha}) 4px)`,
        opacity: 0.5,
        mixBlendMode: (mode === "dark" ? "overlay" : "multiply") as React.CSSProperties["mixBlendMode"],
      }}
      aria-hidden="true"
    />
  );
}
