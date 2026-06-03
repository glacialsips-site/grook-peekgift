import DOMPurify from "isomorphic-dompurify";

// custom-section html is the model's escape hatch for a signature move no archetype fits. It is
// authored against the --peek-* css vars via INLINE styles, so we keep the `style` attribute but
// forbid the <style> tag (which could break out of the device frame and restyle the whole app),
// <script>/<iframe>/<form>/etc., and any event-handler attributes. Allowlist (not denylist) so
// only known-safe structure survives. Runs server-side in the curator turn, before the html ever
// enters the document — the renderer then paints already-sanitized markup (contract §custom).
const ALLOWED_TAGS = [
  "div", "section", "article", "header", "footer", "main", "aside", "nav", "span", "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
  "blockquote", "figure", "figcaption", "em", "strong", "i", "b", "u", "s", "small", "sup", "sub",
  "mark", "abbr", "time", "code", "pre", "a", "img", "picture", "source",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "svg", "path", "g", "circle", "rect", "line", "polyline", "polygon", "ellipse",
  "defs", "linearGradient", "radialGradient", "stop", "text", "tspan", "use", "symbol",
];

const ALLOWED_ATTR = [
  "style", "class", "id", "href", "target", "rel", "src", "srcset", "sizes", "alt", "title",
  "width", "height", "datetime", "colspan", "rowspan", "aria-label", "aria-hidden", "role", "loading",
  // svg geometry / paint
  "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "d", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "points", "rx", "ry", "transform",
  "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "opacity",
  "fill-opacity", "preserveAspectRatio", "xmlns",
];

export function sanitizeCustomHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "link", "meta", "base"],
    // strip target=_blank reverse-tabnabbing risk is handled by adding rel; keep it simple here.
    ADD_ATTR: ["target"],
  });
}
