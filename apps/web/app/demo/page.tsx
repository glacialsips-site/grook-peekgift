import { validatePeekIR, render } from "@peek/core";
import { PeekPreview } from "@/components/preview";
import dad from "./fixtures/dad-60th.ir.json";
import gala from "./fixtures/charity-gala.ir.json";
import taquito from "./fixtures/el-taquito.ir.json";

const samples: { name: string; raw: unknown }[] = [
  { name: "For the Old Man · dad-60th", raw: dad },
  { name: "Charity Gala", raw: gala },
  { name: "El Taquito", raw: taquito },
];

export default function Demo() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>render() conformance</h1>
      <p style={{ color: "#9a9aa2", margin: "0 0 22px" }}>
        The design-seat sample documents, validated by the core schema and painted by the one renderer from the
        core view-model. Each runs the runtime <code>--peek-*</code> tokens — no Tailwind, no per-page CSS.
      </p>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        {samples.map((s) => {
          const v = validatePeekIR(s.raw);
          return (
            <figure key={s.name} style={{ margin: 0 }}>
              <figcaption style={{ color: "#c9c9d2", marginBottom: 8, fontSize: 14 }}>{s.name}</figcaption>
              <div
                style={{
                  width: 390,
                  height: 780,
                  borderRadius: 38,
                  overflow: "hidden",
                  border: "1px solid #2a2a30",
                  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
                }}
              >
                {v.ok ? (
                  <PeekPreview model={render(v.value)} />
                ) : (
                  <pre style={{ color: "#ff9090", padding: 16, whiteSpace: "pre-wrap", fontSize: 12 }}>{v.error}</pre>
                )}
              </div>
            </figure>
          );
        })}
      </div>
    </main>
  );
}
