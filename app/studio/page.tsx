// ============================================================================
// app/studio/page.tsx — the STUDIO route entry.
// Server component: loads the chat serif (Source Serif 4) + studio-local CSS
// (caret blink, tool-dot pulse, glass input placeholder, dark scrollbar), then
// mounts the client studio (chat over a live, building PeekRenderer preview).
// The page is keyless-demoable: /api/peek-studio runs the deterministic stub when
// ANTHROPIC_API_KEY is unset, so the preview still builds live.
// ============================================================================

import type { Metadata } from 'next';
import StudioClient from './StudioClient';

export const metadata: Metadata = {
  title: 'peek · studio',
  description: 'Chat a gift page into existence — it builds live as you talk.',
};

// The studio is a full-bleed, fixed surface; never statically prerender stale state.
export const dynamic = 'force-dynamic';

const STUDIO_CSS = `
@keyframes peekBlink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
@keyframes peekPulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .45; transform: scale(.82) } }
.peek-studio-input::placeholder { color: rgba(255,255,255,0.62); }
.peek-studio-scroll::-webkit-scrollbar { width: 0; height: 0; }
`;

export default function StudioPage() {
  return (
    <>
      {/* chat serif — matches the reference chat-ui (Source Serif 4) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />
      <StudioClient />
    </>
  );
}
