import { loadPeekBySlug, persistenceConfigured } from "@/lib/persistence/store";
import { loadPicks } from "@/lib/persistence/picks";
import { RecipientView } from "@/components/recipient-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RecipientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await loadPeekBySlug(slug);

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

  const picks = await loadPicks(doc.peek.id);
  return <RecipientView doc={doc} initialPicks={picks} />;
}
