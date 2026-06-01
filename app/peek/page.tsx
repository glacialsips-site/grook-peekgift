// Standalone host for the Peek chat. Self-contained — no auth gate — so it boots
// and demos with zero configuration. Add ?demo=1 to open on a fully-built example
// page (useful for review/screenshots).

import PeekChat from "./PeekChat";
import type { ChatMessage, GiftPage } from "../../lib/peek/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Peek — build a gift page",
};

function demoSeed(): { page: GiftPage; messages: ChatMessage[] } {
  const page: GiftPage = {
    recipient: {
      name: "Maya",
      relationship: "my sister",
      occasion: "just because",
      notes: "loves slow mornings & pottery",
    },
    theme: {
      name: "Dusk Citrus",
      vibe: "warm, editorial, a little playful",
      bg: "#1C1A24",
      surface: "#262232",
      text: "#F3EFE7",
      accent: "#E5944B",
    },
    cards: [
      {
        id: "c_demo1",
        type: "product",
        title: "Hand-thrown ceramic pour-over",
        description: "A slow-coffee ritual, one cup at a time.",
        price: "$68",
        rule: { kind: "pick_one_of", group: "the-ritual" },
      },
      {
        id: "c_demo2",
        type: "activity",
        title: "Twilight pottery class for two",
        description: "Make the next mug yourselves.",
        price: "$140",
        rule: { kind: "pick_one_of", group: "the-ritual" },
      },
      {
        id: "c_demo3",
        type: "aspirational",
        title: "A week in a Kyoto machiya",
        description: "The someday trip. Pinned here as a wish.",
        price: "—",
        rule: { kind: "decorative_taunt", message: "Not this year. But I see you." },
      },
    ],
  };
  const messages: ChatMessage[] = [
    { role: "assistant", content: "Hi — I'm Peek. Who are we making a gift page for?" },
    { role: "user", content: "My sister Maya — she loves slow mornings and pottery." },
    {
      role: "assistant",
      content:
        "Perfect. I set a dusky, citrus-warm tone and started with a coffee ritual — and I'd let her pick just one. There's a Kyoto trip pinned at the bottom as a wink.",
    },
  ];
  return { page, messages };
}

export default async function PeekPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  if (sp?.demo) {
    const seed = demoSeed();
    return <PeekChat initialPage={seed.page} initialMessages={seed.messages} />;
  }
  return <PeekChat />;
}
