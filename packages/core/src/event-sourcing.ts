import type { Result } from "neverthrow";

/**
 * The pure spine of the maker-checker.
 *
 * A document is the fold of its events. The chat never mutates the document
 * directly: it proposes a Command, `decide` validates it against the current
 * document and returns either an Err or the Events it would produce, and
 * `apply` folds an Event onto the document. Undo / history / replay fall out of
 * this for free, and a malformed AI op bounces at the boundary instead of
 * corrupting a page.
 */

export type Reducer<Doc, Ev> = (doc: Doc, event: Ev) => Doc;

/**
 * `decide(document, command)` is the checker: it never throws and never
 * partially applies. It returns the events a command would produce, or a typed
 * error. The events it returns are the only way the document ever changes.
 */
export type Decider<Doc, Cmd, Ev, E> = (
  doc: Doc,
  command: Cmd,
) => Result<Ev[], E>;

/** Fold a sequence of events onto an initial document. Pure. */
export function fold<Doc, Ev>(
  initial: Doc,
  events: readonly Ev[],
  apply: Reducer<Doc, Ev>,
): Doc {
  return events.reduce<Doc>((doc, event) => apply(doc, event), initial);
}

/** Reconstruct a document from its full event log. Pure; alias of fold. */
export function replay<Doc, Ev>(
  initial: Doc,
  log: readonly Ev[],
  apply: Reducer<Doc, Ev>,
): Doc {
  return fold(initial, log, apply);
}
