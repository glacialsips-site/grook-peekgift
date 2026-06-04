import DOMPurify from "isomorphic-dompurify";


const ALLOWED_TAGS = [
  "html", "head", "body", "title", "meta", "link", "style",
  "div", "section", "article", "header", "footer", "main", "aside", "nav", "span", "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
  "blockquote", "figure", "figcaption", "em", "strong", "i", "b", "u", "s", "small", "sup", "sub",
  "mark", "abbr", "time", "code", "pre", "a", "button", "label", "img", "picture", "source",
  "video", "audio", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "svg", "path", "g", "circle", "rect", "line", "polyline", "polygon", "ellipse", "defs",
  "linearGradient", "radialGradient", "stop", "text", "tspan", "use", "symbol", "clipPath",
  "mask", "filter", "feGaussianBlur", "feOffset", "feMerge", "feMergeNode", "feColorMatrix",
  "feBlend", "feFlood", "feComposite", "pattern", "image", "marker", "foreignObject",
];

const ALLOWED_ATTR = [
  "style", "class", "id", "title", "role", "tabindex", "lang", "dir",
  "aria-label", "aria-hidden", "aria-modal", "aria-live",
  "href", "target", "rel", "crossorigin", "as", "media",
  "src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding",
  "poster", "controls", "muted", "loop", "playsinline", "autoplay", "preload",
  "type", "name", "content", "charset", "property", "datetime", "colspan", "rowspan", "for",
  "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "d", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2",
  "points", "rx", "ry", "transform", "offset", "stop-color", "stop-opacity", "gradientUnits",
  "gradientTransform", "spreadMethod", "opacity", "fill-opacity", "fill-rule", "clip-rule",
  "clip-path", "mask", "filter", "preserveAspectRatio", "xmlns", "xmlns:xlink", "xlink:href",
  "stdDeviation", "in", "in2", "result", "mode", "values", "dx", "dy", "patternUnits",
  "patternContentUnits", "patternTransform", "markerWidth", "markerHeight", "refX", "refY", "orient",
];

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "textarea", "select", "base", "noscript"],
  FORBID_ATTR: ["http-equiv"],
  ADD_ATTR: ["target"],
};

function sanitizeCssText(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "/*x*/(")
    .replace(/(?:behavior|-moz-binding)\s*:[^;}]*/gi, "")
    .replace(/url\(\s*(['"]?)\s*javascript:[^)]*\)/gi, "url()");
}

let _hooked = false;
function ensureCssHooks(): void {
  if (_hooked) return;
  _hooked = true;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "style" && node.textContent) {
      node.textContent = sanitizeCssText(node.textContent);
    }
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as unknown as {
      getAttribute?: (k: string) => string | null;
      setAttribute?: (k: string, v: string) => void;
    };
    if (typeof el.getAttribute !== "function" || typeof el.setAttribute !== "function") return;
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", sanitizeCssText(style));
    if (el.getAttribute("target") === "_blank") el.setAttribute("rel", "noopener noreferrer");
  });
}

export function sanitizeHtml(dirty: string, wholeDocument = false): string {
  ensureCssHooks();
  return DOMPurify.sanitize(dirty, { ...CONFIG, WHOLE_DOCUMENT: wholeDocument });
}

export function sanitizeCustomHtml(dirty: string): string {
  return sanitizeHtml(dirty, false);
}
