import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(120% 90% at 50% -10%, #2a2030, #1a1518)",
        color: "#FAF7F2",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", color: "#D97757", marginBottom: 18 }}>
          peek.gift
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(40px,8vw,76px)", lineHeight: 1.04, margin: "0 0 18px", fontWeight: 500 }}>
          A gift page,
          <br />
          <em style={{ color: "#D97757" }}>built by chatting.</em>
        </h1>
        <p style={{ color: "#9C988F", maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Tell Claude who it&apos;s for. Watch a one-of-one page build itself, live.
        </p>
        <Link
          href="/build"
          style={{
            display: "inline-block",
            background: "#D97757",
            color: "#1a1518",
            fontWeight: 700,
            padding: "16px 30px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Build a peek →
        </Link>
      </div>
    </main>
  );
}
