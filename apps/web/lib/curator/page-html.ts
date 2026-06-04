// Server-side authoritative page state for autosave. The curator turn streams page ops to
// the iframe (set_page / edit_region / set_style / set_media); the route mirrors them onto a
// server-held HTML string with applyPageOp() so it can persist the cumulative page without
// asking the client to serialize the iframe. Pure (deterministic); the only side input is the
// sha256 of the html (node:crypto), used as the lockstep/drift hash.

import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import type { StreamEvent } from "./turn";

export const PEEK_RUNTIME_VERSION = "1";

export function htmlHash(html: string): string {
  return createHash("sha256").update(html).digest("hex");
}

/**
 * Wrap an authored page for a host iframe: inject `window.__PEEK__` + the host runtime before
 * </body>. `mode` is "preview" in the studio and "recipient" on the published page. On the
 * recipient surface this runs inside a SANDBOXED, opaque-origin iframe (no allow-same-origin),
 * so the runtime cannot reach the app's cookies/session even though it executes.
 */
export function frameDoc(html: string, mode: "preview" | "recipient"): string {
  const inject = `\n<script>window.__PEEK__={mode:${JSON.stringify(mode)}};</script>\n<script src="/peek-runtime.js"></script>\n`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${inject}</body>`) : html + inject;
}

// node-html-parser round-trips the body but can drop a leading <!doctype>; preserve it.
function keepDoctype(original: string, rebuilt: string): string {
  const m = original.match(/^\s*<!doctype[^>]*>/i);
  if (m && !/^\s*<!doctype/i.test(rebuilt)) return `${m[0]}\n${rebuilt}`;
  return rebuilt;
}

/**
 * Apply one streamed page op to the server-side authoritative HTML, mirroring the studio
 * iframe (page = whole document; patch = replace one node; style = append a style block;
 * media = set an image src/background). Unknown events return the html unchanged.
 */
export function applyPageOp(html: string, ev: StreamEvent): string {
  switch (ev.type) {
    case "page":
      return ev.html;
    case "patch": {
      if (!html) return html;
      const root = parse(html);
      const el = root.querySelector(ev.selector);
      if (!el) return html;
      el.replaceWith(ev.html);
      return keepDoctype(html, root.toString());
    }
    case "style": {
      if (!html) return `<style>${ev.css}</style>`;
      const root = parse(html);
      const head = root.querySelector("head") ?? root;
      head.insertAdjacentHTML("beforeend", `<style>${ev.css}</style>`);
      return keepDoctype(html, root.toString());
    }
    case "media": {
      if (!html) return html;
      const root = parse(html);
      const el = root.querySelector(ev.selector);
      if (!el) return html;
      if (el.tagName === "IMG") el.setAttribute("src", ev.url);
      else el.setAttribute("style", `${el.getAttribute("style") ?? ""};background-image:url("${ev.url}")`);
      return keepDoctype(html, root.toString());
    }
    default:
      return html;
  }
}
