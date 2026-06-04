import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import type { StreamEvent } from "./turn";

export const PEEK_RUNTIME_VERSION = "1";

export function htmlHash(html: string): string {
  return createHash("sha256").update(html).digest("hex");
}

export function frameDoc(html: string, mode: "preview" | "recipient"): string {
  const inject = `\n<script>window.__PEEK__={mode:${JSON.stringify(mode)}};</script>\n<script src="/peek-runtime.js"></script>\n`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${inject}</body>`) : html + inject;
}

function keepDoctype(original: string, rebuilt: string): string {
  const m = original.match(/^\s*<!doctype[^>]*>/i);
  if (m && !/^\s*<!doctype/i.test(rebuilt)) return `${m[0]}\n${rebuilt}`;
  return rebuilt;
}

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
