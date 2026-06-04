import type {
  PeekIR,
  PeekDocument,
  Peek,
  ThemeSpec,
  Concept,
  PageType,
  ISODate,
} from "./contract";

const EPOCH: ISODate = "1970-01-01T00:00:00.000Z";

export interface EmptyDocumentSeed {
  id?: string;
  slug?: string;
  curator_id?: string;
  page_type?: PageType;
  now?: ISODate;
}

function emptyConcept(): Concept {
  return { oneLiner: "", boldMove: "", voice: "", emotionalCore: "" };
}

function emptyTheme(): ThemeSpec {
  return {
    type: {
      display: { family: "Inter" },
      body: { family: "Inter" },
      scaleRatio: 1.25,
    },
    palette: {
      mode: "light",
      bg: "#ffffff",
      surface: "#f6f6f7",
      ink: "#15161a",
      muted: "#6b6f76",
      line: "#e4e5e9",
      accent: "#3b5bdb",
    },
    scene: "none",
    motifs: [],
    frame: "plain",
    radius: { card: 14, pill: 999 },
    space: { sectionY: 64, gutter: 22, stack: 12 },
    motion: { intensity: 0.25, reduceMotionOK: true },
  };
}

/**
 * A pure, valid, empty draft PeekIR — the base document the chat mutates through
 * commands. Deterministic given its seed (no Date.now / no random), so it is safe
 * as a reducer base and in tests. Identity + timestamps are caller-supplied; the
 * concept is intentionally blank (the chat must fill it before a page is useful).
 */
export function emptyDocument(seed: EmptyDocumentSeed = {}): PeekIR {
  const now = seed.now ?? EPOCH;
  const peek: Peek = {
    id: seed.id ?? "",
    slug: seed.slug ?? "",
    curator_id: seed.curator_id ?? "",
    page_type: seed.page_type ?? "gift",
    recipient_name: null,
    relationship: null,
    occasion: null,
    concept: emptyConcept(),
    theme: emptyTheme(),
    hero: null,
    note_md: null,
    cta_label: null,
    status: "draft",
    stripe_payment_intent_id: null,
    stripe_checkout_session_id: null,
    published_at: null,
    expires_at: null,
    share_url: null,
    created_at: now,
    updated_at: now,
  };
  return { schema_version: 1, peek, sections: [], variant_groups: [], cards: [] };
}

/**
 * The same empty draft as the dual-representation envelope: a blank spine and no
 * presentation yet (the chat authors the HTML, which fills `presentation` later).
 */
export function emptyPeekDocument(seed: EmptyDocumentSeed = {}): PeekDocument {
  return { schema_version: 2, spine: emptyDocument(seed), presentation: null };
}
