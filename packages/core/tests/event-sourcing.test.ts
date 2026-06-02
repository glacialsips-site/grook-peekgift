import { describe, it, expect } from "vitest";
import { fold, replay, type Reducer } from "../src/event-sourcing";

type Doc = { count: number; log: string[] };
type Ev = { type: "inc"; by: number } | { type: "label"; text: string };

const apply: Reducer<Doc, Ev> = (doc, e) =>
  e.type === "inc"
    ? { ...doc, count: doc.count + e.by }
    : { ...doc, log: [...doc.log, e.text] };

const empty: Doc = { count: 0, log: [] };

describe("event-sourcing spine", () => {
  it("folds events into state", () => {
    const events: Ev[] = [
      { type: "inc", by: 2 },
      { type: "label", text: "a" },
      { type: "inc", by: 3 },
    ];
    expect(fold(empty, events, apply)).toEqual({ count: 5, log: ["a"] });
  });

  it("replay reconstructs an identical document from its log", () => {
    const events: Ev[] = [
      { type: "inc", by: 1 },
      { type: "label", text: "x" },
      { type: "inc", by: 9 },
    ];
    expect(replay(empty, events, apply)).toEqual(fold(empty, events, apply));
  });

  it("does not mutate the initial document", () => {
    fold(empty, [{ type: "inc", by: 5 }], apply);
    expect(empty).toEqual({ count: 0, log: [] });
  });
});
