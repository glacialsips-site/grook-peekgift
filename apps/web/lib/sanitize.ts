import DOMPurify from "isomorphic-dompurify";

// The model authors freeform HTML/CSS/SVG; this strips anything executable while KEEPING the
// soul — full <style> blocks, @keyframes, pseudo-elements, SVG, web-font <link>s — and KEEPING
// the data-peek-* interaction contract (ALLOW_DATA_ATTR). An inline-style-only sanitizer kills
// keyframes and pseudo-elements, which is exactly where the design lives — so this allows them
// and instead removes <script>, event handlers, javascript: urls, and form/embed vectors.
// Used server-side (curator turn emits sanitized HTML to the iframe; persist re-sanitizes).

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
  // svg paint / geometry
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
  ALLOW_DATA_ATTR: true, // the data-peek-* interaction contract MUST survive
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "textarea", "select", "base", "noscript"],
  FORBID_ATTR: ["http-equiv"], // block <meta http-equiv="refresh">
  ADD_ATTR: ["target"],
};

/** Sanitize a model-authored page. wholeDocument=true keeps <head>/<style>/<link> (set_page);
 *  false treats the input as a fragment (edit_region). */
export function sanitizeHtml(dirty: string, wholeDocument = false): string {
  return DOMPurify.sanitize(dirty, { ...CONFIG, WHOLE_DOCUMENT: wholeDocument });
}

// Back-compat for any caller of the old name.
export function sanitizeCustomHtml(dirty: string): string {
  return sanitizeHtml(dirty, false);
}
