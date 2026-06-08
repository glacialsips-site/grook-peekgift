// @ts-nocheck
import { SEAT } from "../seat.ts";

const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const TOOLS = [
  {
    name: "set_page",
    description:
      "Author the WHOLE page as one freeform HTML document and show it. Call this FIRST so the page appears at once. Include your own Google Fonts <link>, a <style> block, bespoke CSS, and CSS/SVG motion. Tag every interactive/claimable thing with the data-peek-* contract. CSS/SVG only — never a <script>, <form>, <input>, or an inline data:/base64 image; for texture use gradients or SVG filters, for an image you don't have leave a treated slot.",
    input_schema: { type: "object", properties: { html: { type: "string" } }, required: ["html"] },
    eager_input_streaming: true,
  },
  {
    name: "publish",
    description: "Flag the page ready for the $12 checkout. Call when the page is useful, not perfect.",
    input_schema: { type: "object", properties: {} },
  },
];

function refineFraming(currentHtml, instruction) {
  return (
    `This is a page you already made and the creator approved. They're now asking for one change in plain words. ` +
    `Make the smallest change that satisfies it and keep everything else exactly as designed — same concept, same cards, ` +
    `same layout, same copy, same mechanics. Return the full updated page via set_page.\n\n` +
    `CREATOR'S REQUEST: ${instruction}\n\nCURRENT PAGE:\n${currentHtml}`
  );
}

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const key =
    (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get("ANTHROPIC_API_KEY")) ||
    (typeof Deno !== "undefined" && Deno.env.get("ANTHROPIC_API_KEY")) ||
    "";
  if (!key) return new Response("ANTHROPIC_API_KEY not set on this site", { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return new Response("bad request", { status: 400 });

  let apiMessages;
  if (body.currentHtml && typeof body.currentHtml === "string") {
    const lastUser = [...body.messages].reverse().find((m) => m && m.role === "user");
    const instruction = lastUser ? (typeof lastUser.content === "string" ? lastUser.content : "(see attached)") : "";
    apiMessages = [{ role: "user", content: refineFraming(body.currentHtml, instruction) }];
  } else {
    apiMessages = body.messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({ role: m.role, content: m.content }));
  }
  if (!apiMessages.length) return new Response("no messages", { status: 400 });

  const payload = {
    model: MODEL,
    max_tokens: 32000,
    stream: true,
    system: [{ type: "text", text: SEAT, cache_control: { type: "ephemeral" } }],
    tools: TOOLS,
    messages: apiMessages,
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s) => { try { controller.enqueue(enc.encode(s)); } catch (_) {} };
      send(": warming up\n\n");
      const ping = setInterval(() => send(": ping\n\n"), 15000);
      let setPageIndex = -1;
      try {
        const upstream = await fetch(ANTHROPIC, {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          send(`event: error\ndata: ${JSON.stringify({ message: `upstream ${upstream.status}: ${t.slice(0, 400)}` })}\n\n`);
          return;
        }
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            let data = "";
            for (const line of block.split("\n")) if (line.startsWith("data:")) data += line.slice(5).trim();
            if (!data) continue;
            let evt;
            try { evt = JSON.parse(data); } catch (_) { continue; }
            const t = evt.type;
            if (t === "content_block_start") {
              const cb = evt.content_block;
              if (cb && cb.type === "tool_use" && cb.name === "set_page") setPageIndex = evt.index;
            } else if (t === "content_block_delta") {
              const d = evt.delta || {};
              if (d.type === "text_delta" && d.text) {
                send(`event: text\ndata: ${JSON.stringify(d.text)}\n\n`);
              } else if (d.type === "input_json_delta" && typeof d.partial_json === "string" && evt.index === setPageIndex) {
                send(`event: html\ndata: ${JSON.stringify(d.partial_json)}\n\n`);
              }
            } else if (t === "error") {
              send(`event: error\ndata: ${JSON.stringify({ message: (evt.error && evt.error.message) || "stream error" })}\n\n`);
            }
          }
        }
        send(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`);
      } catch (err) {
        send(`event: error\ndata: ${JSON.stringify({ message: String((err && err.message) || err) })}\n\n`);
      } finally {
        clearInterval(ping);
        try { controller.close(); } catch (_) {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
};

export const config = { path: "/api/generate" };
