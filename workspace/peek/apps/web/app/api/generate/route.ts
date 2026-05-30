/**
 * POST /api/generate — the synthesis endpoint.
 *
 * Body is one of:
 *   { brief: string }                                   → fresh generation
 *   { mode: "tweak", genome, peek, change: string }     → revise the current design
 *
 * Returns { genome, peek } on success, or { error } with a 503 so the Builder can fall back
 * to its keyword stub. Node runtime: the Anthropic SDK + zod-to-json-schema need Node APIs.
 */
import { synthesize, tweak, SynthesisError } from "../../../lib/synthesize";
import type { Genome } from "@peek/vibe-genome";
import type { Peek } from "@peek/site-ir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // generation + adaptive thinking can take a while

type Body =
  | { brief: string }
  | { mode: "tweak"; genome: Genome; peek: Peek; change: string };

export async function POST(req: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    const result =
      "mode" in body && body.mode === "tweak"
        ? await tweak(body.genome, body.peek, body.change)
        : await synthesize("brief" in body ? body.brief : "");
    return Response.json(result);
  } catch (err) {
    const status = err instanceof SynthesisError ? 503 : 500;
    const message = err instanceof Error ? err.message : "synthesis failed";
    // Surface the reason in logs; the Builder only needs to know it failed.
    console.error("[generate] synthesis failed:", message);
    return Response.json({ error: message }, { status });
  }
}
