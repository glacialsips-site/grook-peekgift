import { loadDocumentBySlug, persistenceConfigured } from "@/lib/persistence/store";
import { loadPicks } from "@/lib/persistence/picks";
import { RecipientView } from "@/components/recipient-view";
import { sanitizeHtml } from "@/lib/sanitize";
import { frameDoc } from "@/lib/curator/page-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RecipientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await loadDocumentBySlug(slug);

  if (!doc) {
    return (
      <main style={{ padding: 28, maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>nothing here yet</h1>
        <p style={{ color: "#9a9aa2" }}>
          {persistenceConfigured()
            ? "this page hasn’t been published, or the link is wrong."
            : "persistence isn’t configured in this environment, so there’s nothing to load."}
        </p>
      </main>
    );
  }

  // Dual representation: serve the model's AUTHORED page (the design caliber the curator paid
  // for) — re-sanitized on the way out, with the host runtime in recipient mode — inside a
  // SANDBOXED, opaque-origin iframe. `sandbox="allow-scripts"` WITHOUT allow-same-origin means
  // the page executes its own CSS/SVG/runtime but cannot reach this app's DOM, cookies, Clerk,
  // or Stripe — so even a sanitizer miss can't compromise a recipient's session.
  if (doc.presentation?.html) {
    const recipient = doc.spine.peek.recipient_name;
    const srcDoc = frameDoc(sanitizeHtml(doc.presentation.html, true), "recipient");
    return (
      <iframe
        title={recipient ? `A peek for ${recipient}` : "Your peek"}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#0b0b0f" }}
      />
    );
  }

  // Fallback: IR-only pages (older drafts, or no authored HTML) render through the typed
  // renderer, which stays the deterministic surface for the share/og image too.
  const picks = await loadPicks(doc.spine.peek.id);
  return <RecipientView doc={doc.spine} initialPicks={picks} />;
}
