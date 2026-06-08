export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const PEEK_STUDIO_TOOLS: ToolDef[] = [
  {
    name: "set_page",
    description:
      "Author the WHOLE page as one freeform HTML document and show it. Call this FIRST so the page appears whole; it streams so the curator watches it build. Include your own fonts (a Google Fonts <link>), a <style> block, bespoke CSS + CSS/SVG animation. Tag every interactive/claimable thing with the data-peek-* contract. Decoration is CSS/SVG only — never emit a <script>.",
    input_schema: {
      type: "object",
      properties: {
        html: { type: "string", description: "the complete HTML document (or body markup) for the page" },
      },
      required: ["html"],
    },
  },
  {
    name: "edit_region",
    description:
      "Replace exactly one matched node's markup — the smallest surgical edit that honors the object. Use for a tweak ('add the soup', 'change the headline'); never re-author the whole page for a small note.",
    input_schema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "a CSS selector matching the single node to replace" },
        html: { type: "string", description: "the new outer HTML for that node" },
      },
      required: ["selector", "html"],
    },
  },
  {
    name: "set_style",
    description: "Add or override a themed <style> block — a palette tweak, 'darker', a new motion loop. Appends to the page's styles.",
    input_schema: {
      type: "object",
      properties: { css: { type: "string", description: "CSS to inject" } },
      required: ["css"],
    },
  },
  {
    name: "set_media",
    description: "Drop a resolved image url into a slot (the hero photo, a card image). Sets the matched element's src (or background).",
    input_schema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "selector for the <img> or slot element" },
        url: { type: "string", description: "the image url" },
      },
      required: ["selector", "url"],
    },
  },
  {
    name: "resolve_card",
    description:
      "Resolve a pasted URL OR a fuzzy ask ('a barrel cactus under $40 shipped to 90210') into real product data (title, price, image, source). Returns the data so you can author the tagged card markup with it; hide the retailer from what the recipient sees.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "the curator's fuzzy ask OR a pasted URL" },
        constraints: {
          type: "object",
          properties: {
            maxPriceCents: { type: "integer" },
            shipTo: { type: "string" },
            sizeHint: { type: "string" },
          },
        },
        images: { type: "array", items: { type: "string" }, description: "image urls to read for the resolve" },
      },
      required: ["text"],
    },
  },
  {
    name: "generate_hero_image",
    description:
      "Paint a hero image from a VIVID, specific prompt that honors the object (not 'birthday gift' — 'a tiny dachshund in a paper party hat, soft pastel gouache, cream ground'). Returns a permanent url; place it with set_media or an <img>.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "the vivid image prompt" },
        aspect: { type: "string", description: "16:9 | 4:3 | 1:1 | 9:16 | 3:4 (default 16:9)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "publish",
    description: "Flag the page ready → triggers the $12 checkout. Call when the page is useful (who-it's-for + a few cards + a way to deliver), not when it's perfect.",
    input_schema: { type: "object", properties: {} },
  },
];
