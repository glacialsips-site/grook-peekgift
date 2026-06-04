// Builds the dual-rep envelope (PeekDocument) for an autosave: the authored HTML becomes the
// presentation, and its data-peek-* tags are extracted into the spine's cards/variant_groups.
// Pure + deterministic (given `now`) so it's unit-testable without a DB; the route loads the
// existing document as `base`, calls this, and saves the result.

import { emptyPeekDocument, type PeekDocument } from "@peek/core";
import { extractSpine } from "./extract";
import { htmlHash, PEEK_RUNTIME_VERSION } from "./page-html";

const ANON = "anon";

/** A short, stable slug derived from the peek id (deterministic; same peek → same slug). */
export function mintSlug(peekId: string): string {
  const cleaned = peekId.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return (cleaned || Math.random().toString(36).slice(2)).slice(0, 12);
}

export interface DraftArgs {
  peekId: string;
  curatorId?: string | null;
  html: string;
  base?: PeekDocument | null;
  now?: string;
}

/** Build the envelope to persist: presentation = the html; spine = base + extracted cards. */
export function buildDraftDocument(args: DraftArgs): PeekDocument {
  const now = args.now ?? new Date().toISOString();
  const base =
    args.base ??
    emptyPeekDocument({ id: args.peekId, slug: mintSlug(args.peekId), curator_id: args.curatorId ?? ANON, now });
  const { cards, variant_groups } = extractSpine(args.html);
  return {
    schema_version: 2,
    spine: {
      ...base.spine,
      peek: {
        ...base.spine.peek,
        id: args.peekId,
        slug: base.spine.peek.slug || mintSlug(args.peekId),
        curator_id: args.curatorId ?? base.spine.peek.curator_id ?? ANON,
        updated_at: now,
      },
      cards,
      variant_groups,
    },
    presentation: {
      html: args.html,
      html_hash: htmlHash(args.html),
      runtime_version: PEEK_RUNTIME_VERSION,
      authored_at: now,
    },
  };
}
