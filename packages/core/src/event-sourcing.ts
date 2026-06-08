import type { Result } from "neverthrow";


export type Reducer<Doc, Ev> = (doc: Doc, event: Ev) => Doc;

export type Decider<Doc, Cmd, Ev, E> = (
  doc: Doc,
  command: Cmd,
) => Result<Ev[], E>;

export function fold<Doc, Ev>(
  initial: Doc,
  events: readonly Ev[],
  apply: Reducer<Doc, Ev>,
): Doc {
  return events.reduce<Doc>((doc, event) => apply(doc, event), initial);
}

export function replay<Doc, Ev>(
  initial: Doc,
  log: readonly Ev[],
  apply: Reducer<Doc, Ev>,
): Doc {
  return fold(initial, log, apply);
}
