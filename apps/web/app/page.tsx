import { emptyDocument } from "@peek/core";

export default function Home() {
  // Proves @peek/core resolves + runs inside the Next surface.
  const doc = emptyDocument({ id: "demo", slug: "demo", curator_id: "anon" });
  return (
    <main style={{ padding: 28, maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>peek.gift vNext</h1>
      <p style={{ color: "#9a9aa2", margin: "0 0 20px" }}>
        Core wired into the web surface. Empty document status:{" "}
        <strong style={{ color: "#ededed" }}>{doc.peek.status}</strong>.
      </p>
      <p>
        <a href="/demo" style={{ color: "#7aa2ff" }}>
          → render demo (the sample documents, painted from the core view-model)
        </a>
      </p>
    </main>
  );
}
