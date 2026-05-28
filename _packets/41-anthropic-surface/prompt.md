# Packet 41 — Anthropic agentic surface expansion (Web Search + Web Fetch + Code Execution + Tool Search + Memory + Files + Extended Thinking + defer_loading)

- **Worker:** cc-on-web
- **Branch:** `claude/packet-41-anthropic-surface`
- **Depends on (sequencing):** `atelier-integration` head. Light coordination with packet 40 (prompt-caching) — if 40 lands first, take its changes to `lib/anthropic/chat.ts` as your base; if both ship in parallel, the orchestrator does the three-way merge (the two packets touch the same file but for orthogonal reasons — 40 marks cache breakpoints, 41 expands tool array + Memory backing store).
- **Imports from siblings:** none new (all changes stay inside `atelier/lib/anthropic/**` + `atelier/app/api/**` + `atelier/db/**` territories already in this packet).
- **Validation:** `cd atelier && npm install && npm run typecheck && npm run build` — both green. Manual: see "Test plan" at the bottom.
- **Target paths:**
  - NEW: `atelier/lib/anthropic/tools/memory.ts` (Memory tool registration via `betaMemoryTool` helper + handler)
  - NEW: `atelier/lib/anthropic/memory/store.ts` (Supabase-backed virtual filesystem for Memory)
  - NEW: `atelier/lib/anthropic/memory/paths.ts` (path validation + normalization)
  - NEW: `atelier/lib/anthropic/server-tools.ts` (the 4 Anthropic-executed tool descriptors)
  - NEW: `atelier/lib/anthropic/files-api.ts` (Files API upload wrapper)
  - NEW: `atelier/lib/anthropic/extended-thinking.ts` (session-flag store + helper)
  - NEW: `atelier/lib/anthropic/tools/request_extended_thinking.ts`
  - NEW: `atelier/lib/anthropic/tools/attach_files_api_ref.ts`
  - NEW: `atelier/lib/anthropic/tools/set_curator_memory.ts` (thin façade — the real Memory tool is the Anthropic-routed one; this is the curator-context interop tool per TOOL_MANIFEST §"set_curator_memory")
  - NEW (stubs returning `not_implemented_yet`, registered so Peek can discover via tool_search): `atelier/lib/anthropic/tools/affiliate_search.ts`, `place_search_v2.ts`, `set_countdown.ts`, `set_rules_template.ts`, `unlock_event.ts`, `propose_checkout.ts`, `propose_payment_method.ts`, `propose_subscription.ts`, `share_pack_generate.ts`, `invite_cocurator.ts`, `request_voice_capture.ts`, `request_camera_capture.ts`, `set_reaction_capture_consent.ts`, `set_song_card.ts`, `set_movie_card.ts`, `set_youtube_card.ts`, `share_to_social.ts`
  - NEW: `atelier/app/api/upload/anthropic/route.ts` (upload-to-Files-API endpoint)
  - NEW: `atelier/db/schema/curator_memory.ts` (Drizzle schema for the migration)
  - NEW: `atelier/db/migrations/0013_curator_memory.sql` (copy from `_packets/41-anthropic-surface/migration.sql`)
  - MODIFIED: `atelier/lib/anthropic/client.ts` (add Files API beta header + factory for Files-enabled client)
  - MODIFIED: `atelier/lib/anthropic/chat.ts` (extend tools array with server tools + Memory + tool_search; honor extended-thinking flag; inject curator-memory preload + uploaded_files refs into messages)
  - MODIFIED: `atelier/lib/anthropic/tools/bootstrap.ts` (alpha-sorted import of every new tool file)
  - MODIFIED: `atelier/lib/anthropic/system-prompt.ts` (add 2-line tool_search bullet + 1-line curator-memory interpolation point + Files API reference behavior)
  - MODIFIED: `atelier/lib/anthropic/tools/index.ts` (no change unless we need a `ServerToolDescriptor` parallel registry — see §"Server-tool registration model" below)
  - MODIFIED: `atelier/db/schema/index.ts` (export the new curator_memory table)
  - MODIFIED: `atelier/lib/env.ts` (add optional `WEB_SEARCH_MAX_USES`, `WEB_FETCH_MAX_USES`, `MEMORY_MAX_FILES_PER_CURATOR`, `MEMORY_MAX_FILE_KB`, `EXTENDED_THINKING_BUDGET_TOKENS` — all `.optional()`, default at call site)

---

## Context

The 13 tools we ship today are all CLIENT tools — we own the handler, Anthropic just routes the tool_use block to us. Anthropic Sonnet 4.6 / Opus 4.7 also expose four SERVER tools (executed entirely on Anthropic's side, no handler from us), a CLIENT Memory tool (we own the storage but Anthropic defines the protocol), a Files API (preflight uploads referenced by file_id in messages), extended thinking on demand, and a `defer_loading` mechanic that lets us register 30+ tools without burning the system-prompt prefix.

This packet wires all of it. After this lands, Peek can:

- Fact-find ("Stanley Quencher H2.0 price?") via Anthropic server `web_search` instead of us pretending to scrape.
- Pull a known URL via server `web_fetch` (URL must already be in conversation context — security).
- Run Python in a sandbox via `code_execution` for date math, currency conversion, CSV exports — and unlock the dynamic-filtering variant of web_search/web_fetch.
- Search a catalog of 30+ tools via `tool_search_tool_bm25` — only the 5-7 always-on tools sit in the system prompt; rest load on demand.
- Remember things across sessions ("Sarah is allergic to nuts, Mom likes warm tones") via the Anthropic Memory tool, backed by our `peek_v2.curator_memory` Postgres table.
- Reference big uploads (multi-photo album, recipient PDF, voice memo) by `file_id` via the Files API instead of re-uploading on every turn.
- Take extra thinking time for hard creative jobs (note drafting, rules tree design, recipient profile disambiguation) by calling `request_extended_thinking` before the turn that needs it.

**Critical specs the worker MUST USE EXACTLY (verified against live Anthropic docs at packet-write time):**

| Tool | Type string | Owner | Notes |
|---|---|---|---|
| Web Search | `web_search_20260209` | Anthropic server | Requires `code_execution_20260120` to also be enabled. $10/1000 searches. Curator's Admin must enable in console.anthropic.com → Settings → Privacy. |
| Web Fetch | `web_fetch_20260209` | Anthropic server | FREE beyond token cost. URLs must already appear in conversation context. No JS rendering. |
| Code Execution | `code_execution_20260120` | Anthropic server | Python + Bash sandbox. FREE when combined with web_search/web_fetch. Standard charges otherwise. |
| Tool Search | `tool_search_tool_bm25_20251119` | Anthropic server | BM25-search across the tool catalog. Pairs with `defer_loading: true` on the deferrable tools. |
| Memory | `memory_20250818` | CLIENT — we implement storage | Name: `memory`. 6 commands: `view`, `create`, `str_replace`, `insert`, `delete`, `rename`. Use the SDK's `betaMemoryTool` helper. |
| Files API | n/a — upload endpoint | n/a (preflight) | Beta header: `anthropic-beta: files-api-2025-04-14`. POST `/v1/files` multipart. References in messages: `{type:"document",source:{type:"file",file_id}}` or `{type:"image",source:{type:"file",file_id}}`. Max 500MB/file, 500GB/org. |
| Extended Thinking | parameter, not a tool | parameter on messages.create | `thinking: {type: 'enabled', budget_tokens: 8000}`. Set conditionally per-turn. |

Cross-refs: `_packets/SPINE/CAPABILITY_INVENTORY.md` §A4-A14 (Anthropic agentic surface), `_packets/SPINE/CURATOR_PROMPT.md` §"The shape of the work" + §"How you talk", `_packets/SPINE/TOOL_MANIFEST.md` §"NET-NEW tools" + §"set_curator_memory" + §"attach_files_api_ref" + §"request_extended_thinking", `atelier/lib/anthropic/chat.ts` (existing chat loop), `atelier/lib/anthropic/tools/bootstrap.ts` (registration manifest), `atelier/lib/anthropic/tools/index.ts` (`registerTool` + `getToolSchemas` + `runTool`).

---

## Spec — module by module

### 1. Server-tool registration model

The existing `TOOL_REGISTRY` in `lib/anthropic/tools/index.ts` is shaped for CLIENT tools: `{ name, description, input_schema, handler }`. SERVER tools have no handler — Anthropic executes them — and have a `type` field instead of `name + input_schema`. They use a different shape entirely: e.g. `{ type: 'web_search_20260209', max_uses?, allowed_domains?, blocked_domains?, user_location? }`.

**Approach:** keep the existing client tool registry untouched. Add a parallel module `lib/anthropic/server-tools.ts` that exports `getServerToolDescriptors(): Anthropic.Beta.Messages.MessageCreateParams['tools']` (the union type already supports server-tool entries). The chat route's `chatTurn` then concatenates: `[...getServerToolDescriptors(), ...getClientToolSchemas()]` into the `tools` array on `messages.create`.

Reason: types are simpler. The client registry stays pristine, the server tools are an additive sibling array. Cache breakpoint logic (`withToolsCacheControl`) still works — it marks the LAST tool. Whether that last tool is a server or client one doesn't matter for caching.

```ts
// lib/anthropic/server-tools.ts
import type Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export function getServerToolDescriptors(): Anthropic.MessageCreateParams['tools'] {
  const tools: NonNullable<Anthropic.MessageCreateParams['tools']> = [];

  // Code execution — REQUIRED by the new web_search/web_fetch dynamic-filtering variants.
  // Free when combined with them.
  tools.push({
    type: 'code_execution_20260120',
    name: 'code_execution',
  });

  // Web search — Anthropic-executed. $10/1000.
  // Admin must enable at console.anthropic.com → Privacy.
  tools.push({
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: env.WEB_SEARCH_MAX_USES ?? 10,
    // Optional fields commented out — we ship without restrictions, can tighten later.
    // allowed_domains: [...],
    // blocked_domains: [...],
    // user_location: { type: 'approximate', country: 'US' },
  });

  // Web fetch — FREE beyond tokens.
  tools.push({
    type: 'web_fetch_20260209',
    name: 'web_fetch',
    max_uses: env.WEB_FETCH_MAX_USES ?? 5,
    // citations: { enabled: true },  // enable when packet 42 / aspirational cards land
    max_content_tokens: 50_000,
  });

  // Tool search — pairs with defer_loading on client tools.
  tools.push({
    type: 'tool_search_tool_bm25_20251119',
    name: 'tool_search_tool_bm25',
  });

  return tools;
}
```

The exact Anthropic SDK type for `tools[i]` is in `node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts` (or the equivalent Beta surface for `memory_20250818`). The interfaces line up with the verified specs — use the SDK types, don't hand-roll the field names.

### 2. Memory tool (`memory_20250818`)

This is a CLIENT tool (we own storage), but it doesn't use our existing `registerTool` API because Anthropic's SDK ships a typed helper `betaMemoryTool(handlers)` (`node_modules/@anthropic-ai/sdk/helpers/beta/memory.d.ts`) that gives type-narrowing for the 6 commands.

The Memory tool DOES NOT flow through `runTool` in `chat.ts`. Instead, it integrates via `chatTurn` calling the helper inline when a `tool_use` block with `name: 'memory'` appears (per the SDK pattern).

**Worker decision:** for simplicity AND to keep `chatTurn` agnostic to the tool's specifics, register Memory as a special-case path in the chat loop. The new flow:

1. `tools` array (passed to messages.create) includes the memory descriptor: `{ type: 'memory_20250818', name: 'memory' }`. The descriptor is generated in `lib/anthropic/server-tools.ts` (alongside the other Anthropic-side tools) OR in a sibling module — your call. Recommended: same `server-tools.ts` file with a comment noting Memory's hybrid nature (Anthropic-routed, client-handled).
2. In `chat.ts`, when a `tool_use` block comes back with `name: 'memory'`, route it to `handleMemoryTool(input, ctx)` defined in `lib/anthropic/memory/store.ts` BEFORE the generic `runTool` dispatch. This lets us use the SDK's typed handler for the 6 commands.

```ts
// lib/anthropic/memory/store.ts
import { betaMemoryTool } from '@anthropic-ai/sdk/helpers/beta/memory';
import { getSupabaseService } from '@/lib/supabase/service';
import { validatePath, prefixForUser } from './paths';
import { env } from '@/lib/env';

const MEMORY_MAX_FILES = env.MEMORY_MAX_FILES_PER_CURATOR ?? 100;
const MEMORY_MAX_BYTES = (env.MEMORY_MAX_FILE_KB ?? 50) * 1024;

export type MemoryContext = { clerkUserId: string };

const MEMORY_NOT_FOUND_MSG = 'Error: File not found'; // EXACT — Claude is trained on this.

export function buildMemoryHandler(ctx: MemoryContext): ReturnType<typeof betaMemoryTool> {
  if (!ctx.clerkUserId) {
    throw new Error('memory_unavailable_anon');
  }
  const sb = getSupabaseService();
  const userId = ctx.clerkUserId;

  return betaMemoryTool({
    view: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      // If path ends with / OR points to a "directory" (no exact file row), list.
      const isDir = path.endsWith('/') || !(await rowExists(sb, userId, path));
      if (isDir) {
        const prefix = path.endsWith('/') ? path : path + '/';
        const { data, error } = await sb
          .from('curator_memory')
          .select('path, size_bytes, updated_at')
          .eq('clerk_user_id', userId)
          .like('path', prefix + '%')
          .order('path', { ascending: true });
        if (error) throw new Error(`memory_read_failed: ${error.message}`);
        if (!data || data.length === 0) {
          // Empty directory or non-existent — return empty listing, NOT an error.
          return `Directory contents of ${path}:\n(empty)`;
        }
        const lines = data.map(r => `${r.path}  (${r.size_bytes} bytes, ${r.updated_at})`);
        return `Directory contents of ${path}:\n${lines.join('\n')}`;
      }
      // File read.
      const { data, error } = await sb
        .from('curator_memory')
        .select('content')
        .eq('clerk_user_id', userId)
        .eq('path', path)
        .maybeSingle();
      if (error) throw new Error(`memory_read_failed: ${error.message}`);
      if (!data) return MEMORY_NOT_FOUND_MSG;
      // Add line numbers per Anthropic format (1-indexed, padded).
      const lines = data.content.split('\n');
      if (cmd.view_range && cmd.view_range.length === 2) {
        const [start, end] = cmd.view_range;
        const sliced = lines.slice(Math.max(start - 1, 0), end);
        return sliced.map((l, i) => `${String(start + i).padStart(6, ' ')}\t${l}`).join('\n');
      }
      return lines.map((l, i) => `${String(i + 1).padStart(6, ' ')}\t${l}`).join('\n');
    },

    create: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      const sizeBytes = Buffer.byteLength(cmd.file_text, 'utf8');
      if (sizeBytes > MEMORY_MAX_BYTES) {
        return `Error: File too large (${sizeBytes} bytes, max ${MEMORY_MAX_BYTES})`;
      }
      // Enforce per-curator file count ceiling.
      const { count, error: countErr } = await sb
        .from('curator_memory')
        .select('*', { count: 'exact', head: true })
        .eq('clerk_user_id', userId);
      if (countErr) throw new Error(`memory_count_failed: ${countErr.message}`);
      if ((count ?? 0) >= MEMORY_MAX_FILES) {
        return `Error: Memory file limit reached (${MEMORY_MAX_FILES}). Delete a file first.`;
      }
      const { error } = await sb
        .from('curator_memory')
        .upsert({
          clerk_user_id: userId,
          path,
          content: cmd.file_text,
          size_bytes: sizeBytes,
          updated_at: new Date().toISOString(),
        });
      if (error) throw new Error(`memory_create_failed: ${error.message}`);
      return `File created successfully at: ${path}`;
    },

    str_replace: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      const { data, error: readErr } = await sb
        .from('curator_memory')
        .select('content')
        .eq('clerk_user_id', userId)
        .eq('path', path)
        .maybeSingle();
      if (readErr) throw new Error(`memory_read_failed: ${readErr.message}`);
      if (!data) return MEMORY_NOT_FOUND_MSG;
      const occurrences = data.content.split(cmd.old_str).length - 1;
      if (occurrences === 0) {
        return `Error: No match found for old_str`;
      }
      if (occurrences > 1) {
        return `Error: Multiple matches found for old_str (${occurrences}). Provide a more specific old_str.`;
      }
      const next = data.content.replace(cmd.old_str, cmd.new_str);
      const sizeBytes = Buffer.byteLength(next, 'utf8');
      if (sizeBytes > MEMORY_MAX_BYTES) {
        return `Error: File too large after replace (${sizeBytes} bytes, max ${MEMORY_MAX_BYTES})`;
      }
      const { error } = await sb
        .from('curator_memory')
        .update({ content: next, size_bytes: sizeBytes, updated_at: new Date().toISOString() })
        .eq('clerk_user_id', userId)
        .eq('path', path);
      if (error) throw new Error(`memory_update_failed: ${error.message}`);
      return `Successfully replaced text in ${path}`;
    },

    insert: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      const { data, error: readErr } = await sb
        .from('curator_memory')
        .select('content')
        .eq('clerk_user_id', userId)
        .eq('path', path)
        .maybeSingle();
      if (readErr) throw new Error(`memory_read_failed: ${readErr.message}`);
      if (!data) return MEMORY_NOT_FOUND_MSG;
      const lines = data.content.split('\n');
      if (cmd.insert_line < 0 || cmd.insert_line > lines.length) {
        return `Error: insert_line out of range (file has ${lines.length} lines)`;
      }
      lines.splice(cmd.insert_line, 0, cmd.insert_text);
      const next = lines.join('\n');
      const sizeBytes = Buffer.byteLength(next, 'utf8');
      if (sizeBytes > MEMORY_MAX_BYTES) {
        return `Error: File too large after insert (${sizeBytes} bytes, max ${MEMORY_MAX_BYTES})`;
      }
      const { error } = await sb
        .from('curator_memory')
        .update({ content: next, size_bytes: sizeBytes, updated_at: new Date().toISOString() })
        .eq('clerk_user_id', userId)
        .eq('path', path);
      if (error) throw new Error(`memory_update_failed: ${error.message}`);
      return `Successfully inserted text at line ${cmd.insert_line} in ${path}`;
    },

    delete: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      // Allow "directory" deletes via prefix match.
      const isDir = path.endsWith('/');
      if (isDir) {
        const { error } = await sb
          .from('curator_memory')
          .delete()
          .eq('clerk_user_id', userId)
          .like('path', path + '%');
        if (error) throw new Error(`memory_delete_failed: ${error.message}`);
        return `Successfully deleted directory ${path}`;
      }
      const { error, count } = await sb
        .from('curator_memory')
        .delete({ count: 'exact' })
        .eq('clerk_user_id', userId)
        .eq('path', path);
      if (error) throw new Error(`memory_delete_failed: ${error.message}`);
      if (count === 0) return MEMORY_NOT_FOUND_MSG;
      return `Successfully deleted ${path}`;
    },

    rename: async (cmd) => {
      const oldPath = validatePath(userId, cmd.old_path);
      const newPath = validatePath(userId, cmd.new_path);
      const { data, error: readErr } = await sb
        .from('curator_memory')
        .select('content, size_bytes')
        .eq('clerk_user_id', userId)
        .eq('path', oldPath)
        .maybeSingle();
      if (readErr) throw new Error(`memory_read_failed: ${readErr.message}`);
      if (!data) return MEMORY_NOT_FOUND_MSG;
      const { error: upErr } = await sb
        .from('curator_memory')
        .upsert({
          clerk_user_id: userId,
          path: newPath,
          content: data.content,
          size_bytes: data.size_bytes,
          updated_at: new Date().toISOString(),
        });
      if (upErr) throw new Error(`memory_rename_failed: ${upErr.message}`);
      await sb
        .from('curator_memory')
        .delete()
        .eq('clerk_user_id', userId)
        .eq('path', oldPath);
      return `Successfully renamed ${oldPath} to ${newPath}`;
    },
  });
}

async function rowExists(sb: ReturnType<typeof getSupabaseService>, userId: string, path: string): Promise<boolean> {
  const { count } = await sb
    .from('curator_memory')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_user_id', userId)
    .eq('path', path);
  return (count ?? 0) > 0;
}
```

**CRITICAL: the error message strings MUST match the Anthropic spec exactly.** Claude is trained on these specific strings — `Error: File not found`, `Successfully created`, etc. Any deviation breaks the model's ability to recover from errors. Treat them as protocol.

**Path validation** in `lib/anthropic/memory/paths.ts`:

```ts
export function prefixForUser(clerkUserId: string): string {
  return `/memories/${clerkUserId}/`;
}

export function validatePath(clerkUserId: string, raw: string): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('memory_invalid_path: empty');
  }
  // Reject URL-encoded traversal up front.
  const lc = raw.toLowerCase();
  if (lc.includes('%2e') || lc.includes('%2f') || lc.includes('%5c')) {
    throw new Error('memory_invalid_path: encoded_traversal');
  }
  // Collapse double-slashes, normalize.
  const normalized = raw.replace(/\/+/g, '/');
  const expected = prefixForUser(clerkUserId);
  if (!normalized.startsWith(expected)) {
    throw new Error(`memory_invalid_path: outside_namespace (got ${normalized}, expected prefix ${expected})`);
  }
  if (normalized.includes('..')) {
    throw new Error('memory_invalid_path: parent_segment');
  }
  if (!/^[/A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error('memory_invalid_path: invalid_chars');
  }
  return normalized;
}
```

### 3. Memory integration in `chat.ts`

When the model emits a `tool_use` with `name === 'memory'`, the chat loop must:

1. Build the handler via `buildMemoryHandler({ clerkUserId: ctx.userId! })` (anon users: skip entirely — return `{ ok: false, error: 'memory_unauthorized' }` as the tool_result so Claude knows not to retry).
2. Dispatch the command via the SDK helper's `.handlers[cmd.command](cmd)` path.
3. Return the resulting string as `tool_result.content` (memory's response is `string` by spec, not JSON).

Edit `chatTurn` after `messages.push({ role: 'assistant', content: finalMessage.content })`, in the loop that builds `toolResults`:

```ts
for (const call of pendingToolCalls) {
  if (signal?.aborted) return { history: messages, iterations };
  let output: unknown;
  let isError = false;
  let resultContent: string | undefined;  // memory returns string; everything else returns JSON.
  try {
    if (call.name === 'memory') {
      if (!input.ctx.userId) {
        output = { ok: false, error: 'memory_unauthorized', user_message: 'Memory is signed-in-only.' };
      } else {
        const handler = buildMemoryHandler({ clerkUserId: input.ctx.userId });
        const cmd = call.input as Anthropic.Beta.Messages.BetaMemoryTool20250818Command;
        const handlerFn = handler.handlers[cmd.command];
        if (!handlerFn) throw new Error(`unknown_memory_command: ${(cmd as any).command}`);
        const result = await handlerFn(cmd as never);
        // Per SDK contract, handler may return string OR a content-block array.
        resultContent = typeof result === 'string' ? result : JSON.stringify(result);
        output = result;
      }
    } else {
      output = await runTool(call.name, call.input, input.ctx);
    }
  } catch (err) {
    isError = true;
    output = { error: err instanceof Error ? err.message : String(err) };
  }

  await input.onToolResult?.(call.id, call.name, output);

  const resultBlock: Anthropic.ToolResultBlockParam = {
    type: 'tool_result',
    tool_use_id: call.id,
    content: resultContent ?? JSON.stringify(output),
  };
  if (isError) resultBlock.is_error = true;
  toolResults.push(resultBlock);
}
```

The chat route's `onToolResult` UI emitter doesn't need changes — it already receives `(id, name, output)`. For memory, `output` will be a string (the protocol response) — the UI doesn't render this to the curator (memory is invisible by design), but the analytics layer should track `memory.{command}` event.

### 4. Files API integration

Two surfaces:

**4a. Upload endpoint** at `atelier/app/api/upload/anthropic/route.ts`. The existing `atelier/app/api/upload/route.ts` handles Supabase-Storage uploads for hero images and chat attachments. This new endpoint is for "big" curator uploads (>10MB, PDFs, voice memos) that should ride on Anthropic Files API instead of Storage. Both endpoints can coexist — the chat UI's `+` menu picks which based on file type/size:

- Images (jpg/png/webp/gif), <10MB → existing `/api/upload` → Supabase Storage URL → attached as `image_url`
- Images, >10MB OR PDFs OR audio (mp3/m4a/wav, 60s+) → new `/api/upload/anthropic` → Anthropic file_id → stored in `peeks.metadata.uploaded_files[]`

The new endpoint:

```ts
// app/api/upload/anthropic/route.ts
import type { NextRequest } from 'next/server';
import { anthropic } from '@/lib/anthropic/client';
import { uploadToFilesApi } from '@/lib/anthropic/files-api';
import { getUserId } from '@/lib/auth/server';
import { assertPeekAccess } from '@/lib/chat/session';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { enforceRateLimit, limiters, rateLimitResponse } from '@/lib/rate-limit/redis';
import { getClientIp } from '@/lib/security/client-ip';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/upload/anthropic' });

export const runtime = 'nodejs';
export const maxDuration = 300;          // big uploads may take a while
export const dynamic = 'force-dynamic';

const MAX_SIZE = 500 * 1024 * 1024;       // 500MB per Anthropic ceiling
const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg',
]);

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) return originRejectionResponse();
  const peekId = req.nextUrl.searchParams.get('peekId');
  const purposeRaw = req.nextUrl.searchParams.get('purpose');
  if (!peekId) return Response.json({ error: 'peekId required' }, { status: 400 });
  if (!purposeRaw || !['hero_candidate_album', 'recipient_voice_memo', 'recipient_pdf', 'inspiration_doc'].includes(purposeRaw)) {
    return Response.json({ error: 'invalid_purpose' }, { status: 400 });
  }
  const purpose = purposeRaw as 'hero_candidate_album' | 'recipient_voice_memo' | 'recipient_pdf' | 'inspiration_doc';

  const userId = await getUserId();
  const sessionId = req.cookies.get('peek-anon-session')?.value ?? '';
  const access = await assertPeekAccess({ peekId, userId, sessionId });
  if (!access.ok) {
    return Response.json({ error: access.reason }, { status: access.reason === 'forbidden' ? 403 : 404 });
  }

  const ip = getClientIp(req);
  const verdict = await enforceRateLimit(limiters.uploadPerUser(), userId ?? `ip:${ip}`);
  if (!verdict.ok) return rateLimitResponse(verdict);

  let form: FormData;
  try { form = await req.formData(); } catch { return Response.json({ error: 'invalid_form' }, { status: 400 }); }

  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'file field required' }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: 'too_large', max_bytes: MAX_SIZE }, { status: 413 });
  if (!ALLOWED.has(file.type)) return Response.json({ error: 'unsupported_type', type: file.type }, { status: 415 });

  let fileMeta;
  try {
    fileMeta = await uploadToFilesApi(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('files_api_upload_failed', { peekId, msg });
    return Response.json({ error: 'upload_failed', message: msg }, { status: 502 });
  }

  // Append to peeks.metadata.uploaded_files[]
  const [row] = await db.select({ metadata: peeks.metadata }).from(peeks).where(eq(peeks.id, peekId));
  const meta = (row?.metadata as Record<string, unknown>) ?? {};
  const existing = Array.isArray(meta.uploaded_files) ? meta.uploaded_files : [];
  const entry = {
    file_id: fileMeta.id,
    original_name: fileMeta.filename,
    mime: fileMeta.mime_type,
    size_bytes: fileMeta.size_bytes,
    uploaded_at: fileMeta.created_at,
    purpose,
  };
  await db.update(peeks).set({
    metadata: { ...meta, uploaded_files: [...existing, entry] },
    updatedAt: new Date(),
  }).where(eq(peeks.id, peekId));

  return Response.json({ ok: true, file_id: fileMeta.id, purpose, original_name: fileMeta.filename, mime: fileMeta.mime_type, size_bytes: fileMeta.size_bytes });
}
```

**4b. `uploadToFilesApi` wrapper** at `lib/anthropic/files-api.ts`:

```ts
import { anthropic } from './client';
import type Anthropic from '@anthropic-ai/sdk';

export async function uploadToFilesApi(file: File): Promise<Anthropic.Beta.Files.FileMetadata> {
  return anthropic.beta.files.upload(
    { file },
    { headers: { 'anthropic-beta': 'files-api-2025-04-14' } },
  );
}
```

The chat `client.ts` must add the beta header globally so the upload, list, retrieveMetadata, delete operations all see it. Update `client.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export const DEFAULT_MODEL = 'claude-opus-4-7';
export const FAST_MODEL = 'claude-haiku-4-5';

if (!env.ANTHROPIC_API_KEY) {
  console.warn('[anthropic] ANTHROPIC_API_KEY is not set — the client will throw on first call.');
}

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY ?? '',
  maxRetries: 3,
  defaultHeaders: {
    'anthropic-beta': 'files-api-2025-04-14',
  },
});

export function assertAnthropicConfigured(): void {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }
}

export type AnthropicClient = Anthropic;
```

The beta header is benign for messages.create + the other endpoints — it only changes behavior on the files-api routes. Verify in build that no SDK call rejects it (it won't — Anthropic SDK accepts unknown beta headers).

**4c. Inject `uploaded_files` refs into messages**

When Peek calls `attach_files_api_ref` (the existing tool spec in TOOL_MANIFEST), the chat loop should:

1. Look up the entry in `peeks.metadata.uploaded_files[]` matching the `file_id`.
2. On the NEXT user-turn message construction in the chat route, include a content block for the file BEFORE the user text:
   - For PDFs: `{ type: 'document', source: { type: 'file', file_id } }`
   - For images: `{ type: 'image', source: { type: 'file', file_id } }`
   - For audio (Anthropic's Files API supports audio for some endpoints; verify at integration time — if not, fall back to a text mention "[audio file attached: <name>]" and rely on user re-uploading via base64 if Vision/audio is needed)
3. The attach_files_api_ref tool handler records intent in `peeks.metadata.active_attached_file_ids[]` (transient — cleared after the next turn). The chat route inspects this before each user-turn.

```ts
// lib/anthropic/tools/attach_files_api_ref.ts
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { registerTool } from './index';

const InputSchema = z.object({
  file_id: z.string().min(1).max(120),
  purpose: z.enum(['hero_candidate_album', 'recipient_voice_memo', 'recipient_pdf', 'inspiration_doc']),
}).strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: true; file_id: string; purpose: string; attached_at: string } | { ok: false; error: string; user_message?: string };

registerTool<Input, Output>({
  name: 'attach_files_api_ref',
  description: "Attach a previously-uploaded Anthropic Files API file to the next conversation turn. Pass the file_id from peeks.metadata.uploaded_files[] (the curator uploaded it via /api/upload/anthropic). Use when you need to reference a big upload (photo album, PDF, voice memo) Claude already has access to — saves re-uploading. The file appears as a content block on the next user turn.",
  input_schema: {
    type: 'object',
    properties: {
      file_id: { type: 'string', description: 'Anthropic file_id from a prior upload.' },
      purpose: {
        type: 'string',
        enum: ['hero_candidate_album', 'recipient_voice_memo', 'recipient_pdf', 'inspiration_doc'],
        description: 'What the file is for. Drives how the chat route renders it.',
      },
    },
    required: ['file_id', 'purpose'],
  },
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const [row] = await db.select({ metadata: peeks.metadata }).from(peeks).where(eq(peeks.id, ctx.peekId));
    if (!row) return { ok: false, error: 'peek_not_found' };
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const uploaded = Array.isArray(meta.uploaded_files) ? meta.uploaded_files as Array<{ file_id: string }> : [];
    if (!uploaded.some(f => f.file_id === parsed.file_id)) {
      return { ok: false, error: 'file_not_found_in_peek', user_message: 'That upload is not part of this peek.' };
    }
    const active = Array.isArray(meta.active_attached_file_ids) ? meta.active_attached_file_ids as string[] : [];
    if (!active.includes(parsed.file_id)) {
      await db.update(peeks).set({
        metadata: { ...meta, active_attached_file_ids: [...active, parsed.file_id] },
        updatedAt: new Date(),
      }).where(eq(peeks.id, ctx.peekId));
    }
    return { ok: true, file_id: parsed.file_id, purpose: parsed.purpose, attached_at: new Date().toISOString() };
  },
});
```

Chat route augmentation (in `app/api/chat/route.ts`, after the existing `attachments` handling block around line 165-181):

```ts
// After processing curator-provided attachments...
// Pull active_attached_file_ids from peeks.metadata and inject as content blocks.
try {
  const [row] = await db.select({ metadata: peeks.metadata }).from(peeks).where(eq(peeks.id, peekId));
  const meta = (row?.metadata as Record<string, unknown>) ?? {};
  const active = Array.isArray(meta.active_attached_file_ids) ? meta.active_attached_file_ids as string[] : [];
  const uploaded = Array.isArray(meta.uploaded_files) ? meta.uploaded_files as Array<{ file_id: string; mime: string; original_name: string }> : [];
  if (active.length > 0) {
    const fileBlocks: Anthropic.ContentBlockParam[] = active.flatMap(fid => {
      const entry = uploaded.find(u => u.file_id === fid);
      if (!entry) return [];
      if (entry.mime.startsWith('image/')) {
        return [{ type: 'image', source: { type: 'file', file_id: fid } } as Anthropic.ContentBlockParam];
      }
      if (entry.mime === 'application/pdf') {
        return [{ type: 'document', source: { type: 'file', file_id: fid } } as Anthropic.ContentBlockParam];
      }
      // audio fallback
      return [{ type: 'text', text: `[audio file attached: ${entry.original_name} (file_id: ${fid})]` }];
    });
    userContent.unshift(...fileBlocks);
    // Clear the active list — files only inject ONCE per attach call.
    await db.update(peeks).set({
      metadata: { ...meta, active_attached_file_ids: [] },
      updatedAt: new Date(),
    }).where(eq(peeks.id, peekId));
  }
} catch (err) {
  const m = err instanceof Error ? err.message : String(err);
  log.warn('attached_file_injection_failed', { peekId, m });
}
```

### 5. Extended Thinking tool (`request_extended_thinking`)

Per TOOL_MANIFEST it's documented as a "system primitive, not a tool." But to make it Peek-callable AND to let the chat route detect intent cleanly, register it as a real tool that flips a session-scoped flag. The next messages.create iteration of THIS turn reads the flag, adds `thinking: { type: 'enabled', budget_tokens: 8000 }`, and unflips.

```ts
// lib/anthropic/extended-thinking.ts
// Per-turn flag — flipped by request_extended_thinking, consumed by the next chatTurn iteration.
// In-memory Map keyed by sessionId (chatTurn runs entirely server-side, single process per stream).
const FLAGS = new Map<string, true>();

export function requestExtendedThinking(sessionId: string): void {
  FLAGS.set(sessionId, true);
}

export function consumeExtendedThinking(sessionId: string): boolean {
  if (FLAGS.has(sessionId)) {
    FLAGS.delete(sessionId);
    return true;
  }
  return false;
}
```

```ts
// lib/anthropic/tools/request_extended_thinking.ts
import { z } from 'zod';
import { registerTool } from './index';
import { requestExtendedThinking } from '../extended-thinking';
import { env } from '@/lib/env';

const InputSchema = z.object({
  reason: z.enum([
    'note_drafting',
    'rules_tree_design',
    'recipient_disambiguation',
    'other',
  ]),
}).strict();
type Input = z.infer<typeof InputSchema>;
type Output = { ok: true; budget_tokens: number; consumed_on_next_iteration: true } | { ok: false; error: 'voice_mode_blocks_thinking' | 'already_pending' };

registerTool<Input, Output>({
  name: 'request_extended_thinking',
  description: "Flip extended thinking ON for the NEXT message generation iteration of this turn. Use ONLY before the hardest creative jobs: drafting a personal note in the curator's voice, designing a complex rules tree (multi-card locks, beg-locks, event-locks), disambiguating conflicting signals from the curator about a recipient. NEVER use in voice mode (kills sub-1.5s latency). After this tool runs, fire the heavy tool (set_note / set_rules_template / set_recipient_profile) on the SAME assistant turn — the next inner iteration burns the thinking budget on that work.",
  input_schema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        enum: ['note_drafting', 'rules_tree_design', 'recipient_disambiguation', 'other'],
        description: 'Why you need the thinking budget. Used for analytics and rate-limiting.',
      },
    },
    required: ['reason'],
  },
  handler: async (input, ctx): Promise<Output> => {
    InputSchema.parse(input);
    // TODO Tier 1: detect voice-mode flag on session; return voice_mode_blocks_thinking error.
    requestExtendedThinking(ctx.sessionId);
    return {
      ok: true,
      budget_tokens: env.EXTENDED_THINKING_BUDGET_TOKENS ?? 8000,
      consumed_on_next_iteration: true,
    };
  },
});
```

In `chatTurn` (`lib/anthropic/chat.ts`), inside the iteration loop AFTER building `params` and BEFORE the streamMessage call, check the flag:

```ts
const thinkingBudget = env.EXTENDED_THINKING_BUDGET_TOKENS ?? 8000;
const thinkingConsumed = consumeExtendedThinking(input.ctx.sessionId);
const params: Anthropic.MessageStreamParams = {
  model,
  max_tokens: maxTokens,
  system,
  messages,
  tools: tools.length > 0 ? tools : undefined,
  ...(thinkingConsumed
    ? { thinking: { type: 'enabled', budget_tokens: thinkingBudget } }
    : input.thinking
      ? { thinking: input.thinking }
      : {}),
};
```

This way: Peek calls `request_extended_thinking({ reason: 'note_drafting' })` in iteration N, the tool sets the flag, iteration N+1 reads + consumes the flag, the messages.create call for iteration N+1 has `thinking` enabled. Peek's set_note call (which it makes in iteration N alongside request_extended_thinking, or in iteration N+1) burns the thinking budget on its drafting.

**Document in CURATOR_PROMPT** (system-prompt.ts amendment): "When you need to think harder about a creative job — drafting a personal note, designing rules, disambiguating signals — call `request_extended_thinking` BEFORE the heavy tool (set_note, set_rules_template, set_recipient_profile). The thinking applies to your next iteration this turn. Don't use it more than once per turn. Never use it in voice mode."

### 6. defer_loading + tool_search wiring

After this packet, every NET-NEW client tool stub registration sets `defer_loading: true` on the SDK descriptor. The schemas returned by `getToolSchemas()` need to carry this through. Current `getToolSchemas` returns `Anthropic.Tool[]` shaped as `{ name, description, input_schema }`. We need to attach `defer_loading` per-tool.

**Worker decision:** extend `ToolDefinition` with an optional `deferLoading?: boolean` field. Update `registerTool` to accept it. Update `getToolSchemas` to surface it.

```ts
// lib/anthropic/tools/index.ts
export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
  handler: (input: Input, ctx: ToolContext) => Promise<Output>;
  deferLoading?: boolean;
}

export function getToolSchemas(): Anthropic.Tool[] {
  return Array.from(TOOL_REGISTRY.values()).map(
    ({ name, description, input_schema, deferLoading }) => {
      const base: Anthropic.Tool = { name, description, input_schema };
      if (deferLoading) (base as Anthropic.Tool & { defer_loading?: boolean }).defer_loading = true;
      return base;
    },
  );
}
```

(The `defer_loading` field is in the SDK types for tool definitions per the verified specs — see `messages.d.ts` line 994/1001/1841 — but it may not be on the bare `Anthropic.Tool` type alias. If the SDK alias doesn't include it, the cast above is the workaround. Verify at typecheck time.)

**Always-loaded tools (deferLoading: false or unset):**
- `ping`
- `set_recipient`
- `set_recipient_profile`
- `set_vibe`
- `update_vibe`
- `set_note`
- `add_card`
- `mark_ready_for_publish`

**Deferred tools (deferLoading: true):**
- ALL existing tools NOT in the always-loaded list: `add_variant_group`, `generate_hero_image`, `remove_card`, `reorder_cards`, `scrape_url`, `set_hero_image`, `update_card`
- ALL new tools: `affiliate_search`, `place_search_v2`, `set_countdown`, `set_rules_template`, `unlock_event`, `propose_checkout`, `propose_payment_method`, `propose_subscription`, `share_pack_generate`, `invite_cocurator`, `request_voice_capture`, `request_camera_capture`, `set_reaction_capture_consent`, `set_song_card`, `set_movie_card`, `set_youtube_card`, `share_to_social`, `attach_files_api_ref`, `set_curator_memory`, `request_extended_thinking`

Update each tool file to add `deferLoading: true` in its `registerTool({ ... })` call. Use `replace_all` patterns per directory; don't hand-edit each.

**Tool descriptions matter for BM25.** BM25 ranks tool relevance by token overlap with the query. Existing tool descriptions are good but verbose. For deferred tools, ensure the description leads with a verb + noun pair the model is likely to query for: e.g. `affiliate_search` description starts with "Search affiliate-eligible product catalogs (Skimlinks + Sovrn) for product gift options matching a category. Use when curator names a product category they want as a card — coffee gift, skincare, outdoor gear."

The packet does NOT require rewriting every tool description (that's polish for a future packet). Existing descriptions are workable. Just ensure NEW stubs follow the verb-noun-context pattern.

### 7. Stub tools (registrations that return `not_implemented_yet`)

The point of these stubs: Peek can DISCOVER them via tool_search without hallucinating the name (Unknown tool: <name> error). The actual implementation lands in their dedicated packets (42-50).

Pattern (use for ALL 11 stubs — `affiliate_search`, `place_search_v2`, `set_countdown`, `set_rules_template`, `unlock_event`, `propose_checkout`, `propose_payment_method`, `propose_subscription`, `share_pack_generate`, `invite_cocurator`, `request_voice_capture`, `request_camera_capture`, `set_reaction_capture_consent`, `set_song_card`, `set_movie_card`, `set_youtube_card`, `share_to_social`):

```ts
// lib/anthropic/tools/affiliate_search.ts
import { z } from 'zod';
import { registerTool } from './index';

const InputSchema = z.object({
  query: z.string().min(2).max(200),
  category_hint: z.enum(['apparel','home','kitchen','beauty','outdoor','books','tech','kids','jewelry','fragrance','pet','sports','food_and_drink','art','wellness']).optional(),
  price_floor_cents: z.number().int().nonnegative().optional(),
  price_ceiling_cents: z.number().int().nonnegative().optional(),
  max_results: z.number().int().min(1).max(5).default(3),
  prefer_network: z.enum(['skimlinks','sovrn','any']).default('any'),
}).strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: false; error: 'not_implemented_yet'; user_message: string };

registerTool<Input, Output>({
  name: 'affiliate_search',
  description: "Search affiliate-eligible product catalogs (Skimlinks + Sovrn) for product gift options matching a category. Use when curator names a product category they want as a card — 'coffee gift', 'skincare', 'outdoor gear'. Returns 1-5 suggestions; curator picks and you add_card. Never use for activities/restaurants/events — use place_search_v2 instead.",
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      category_hint: { type: 'string', enum: ['apparel','home','kitchen','beauty','outdoor','books','tech','kids','jewelry','fragrance','pet','sports','food_and_drink','art','wellness'] },
      price_floor_cents: { type: 'integer', minimum: 0 },
      price_ceiling_cents: { type: 'integer', minimum: 0 },
      max_results: { type: 'integer', minimum: 1, maximum: 5 },
      prefer_network: { type: 'string', enum: ['skimlinks','sovrn','any'] },
    },
    required: ['query'],
  },
  deferLoading: true,
  handler: async (input): Promise<Output> => {
    InputSchema.parse(input);
    return {
      ok: false,
      error: 'not_implemented_yet',
      user_message: 'Product catalog search lands in packet 42. For now, ask the curator for a specific product (name + URL) and use scrape_url to wrap it.',
    };
  },
});
```

For ALL 11 stubs, use the input_schema documented in TOOL_MANIFEST.md (verbatim). Don't rewrite the field shapes — TOOL_MANIFEST is the spec. The handler returns `{ok:false, error:'not_implemented_yet', user_message: '<pointer to the implementing packet>'}`.

**Hard rule:** EVERY new tool file ALSO adds an alphabetized import line to `bootstrap.ts`. Without that import, the tool isn't registered, can't be found by tool_search, and Peek gets `Unknown tool: <name>`.

### 8. set_curator_memory (façade tool)

TOOL_MANIFEST §"set_curator_memory" defines this as a separate Anthropic-side tool from the raw `memory_20250818`. It's a higher-level interface: instead of Peek picking a path + writing a file, Peek says "remember this fact" with a key/value. The handler translates to Memory's `create` / `str_replace` under the hood.

Pattern:

```ts
// lib/anthropic/tools/set_curator_memory.ts
import { z } from 'zod';
import { registerTool } from './index';
import { buildMemoryHandler } from '../memory/store';
import { prefixForUser } from '../memory/paths';

const InputSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.unknown()), z.record(z.unknown())]),
  expires_at: z.string().datetime().optional(),
}).strict();
type Input = z.infer<typeof InputSchema>;

type Output = { ok: true; key: string; value: unknown } | { ok: false; error: 'memory_unavailable' | 'unauthorized' | 'invalid_key'; user_message?: string };

registerTool<Input, Output>({
  name: 'set_curator_memory',
  description: "Write a durable fact about the curator that should persist across all future peeks. Use for facts that would change the NEXT peek they build: 'Mom's name is Diana, birthday March 14'; 'Sister Hannah, allergic to nuts'; 'Wife and I anniversary Aug 14, prefer warm-romantic vibes'. Do NOT use for transient peek-specific facts (use set_recipient_profile for those). Anon curators: tool fails silently — durable memory requires signed-in.",
  input_schema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Hierarchical dot-key: e.g. family_graph.sister.name, defaults.vibe.preset, recent_recipients.0.name.' },
      value: { description: 'Any JSON value.' },
      expires_at: { type: 'string', format: 'date-time' },
    },
    required: ['key', 'value'],
  },
  deferLoading: true,
  handler: async (input, ctx): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    if (!ctx.userId) {
      return { ok: false, error: 'unauthorized', user_message: 'Memory requires a signed-in curator.' };
    }
    if (!/^[A-Za-z0-9._-]+$/.test(parsed.key)) {
      return { ok: false, error: 'invalid_key' };
    }
    try {
      const handler = buildMemoryHandler({ clerkUserId: ctx.userId });
      // Path: /memories/<clerk_user_id>/kv/<key>.json
      const path = `${prefixForUser(ctx.userId)}kv/${parsed.key}.json`;
      const value = JSON.stringify({ value: parsed.value, expires_at: parsed.expires_at, set_at: new Date().toISOString() });
      const result = await handler.handlers.create({ command: 'create', path, file_text: value });
      if (typeof result === 'string' && result.startsWith('Error:')) {
        // Already exists — overwrite via str_replace on the entire content.
        // For simplicity, just upsert directly via the store. Per-curator file-count
        // ceiling still applies; one row per key.
        // Simpler: re-create by deleting first then creating.
        await handler.handlers.delete({ command: 'delete', path });
        await handler.handlers.create({ command: 'create', path, file_text: value });
      }
      return { ok: true, key: parsed.key, value: parsed.value };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: 'memory_unavailable', user_message: msg };
    }
  },
});
```

The `{curator_memory}` interpolation in the system prompt (per CURATOR_PROMPT §"Context") is sourced from a separate read in the chat route — read `/memories/<clerk_user_id>/profile.md` if it exists, AND glob all `/memories/<clerk_user_id>/kv/*.json` and stringify them as `key: value` lines. Both feed the dynamic system-prompt block.

Chat-route additions (in `app/api/chat/route.ts`, where `curatorName` and `peekSummary` are loaded around line 311-348):

```ts
let curatorMemory: string | null = null;
if (userId) {
  try {
    const { data: rows } = await getSupabaseService()
      .from('curator_memory')
      .select('path, content')
      .eq('clerk_user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (rows && rows.length > 0) {
      const profile = rows.find(r => r.path === `/memories/${userId}/profile.md`);
      const kv = rows.filter(r => r.path.startsWith(`/memories/${userId}/kv/`));
      const parts: string[] = [];
      if (profile) parts.push(`Curator profile:\n${profile.content}`);
      if (kv.length > 0) {
        const kvPairs = kv.map(r => {
          try {
            const parsed = JSON.parse(r.content) as { value: unknown };
            const key = r.path.replace(`/memories/${userId}/kv/`, '').replace(/\.json$/, '');
            return `- ${key}: ${JSON.stringify(parsed.value)}`;
          } catch { return null; }
        }).filter((s): s is string => s !== null);
        if (kvPairs.length > 0) parts.push(`Curator facts:\n${kvPairs.join('\n')}`);
      }
      curatorMemory = parts.join('\n\n');
    }
  } catch (err) {
    log.warn('curator_memory_load_failed', { userId, err: String(err) });
  }
}
// Pass curatorMemory through systemPromptOptions to chatTurn.
```

Extend `SystemPromptOptions`:

```ts
// lib/anthropic/system-prompt.ts
export interface SystemPromptOptions {
  curatorName?: string | null;
  peekStateJson?: string | null;
  curatorMemory?: string | null;   // NEW
}
```

In `getSystemPrompt`, add a section to the dynamic block:

```ts
if (opts.curatorMemory?.trim()) {
  dynamicParts.push(`What you remember about this curator from prior sessions:\n${opts.curatorMemory.trim()}`);
}
```

And in the STATIC system prompt, add to the "Tools available" section (right before the bullet list):

```
Some tools are loaded on demand via tool_search_tool_bm25. If you need a tool that's not in your visible set — like adding a song card, inviting a co-curator, or proposing checkout — issue a tool_search query describing what you want to do in 2-5 words ("add song card", "fire countdown event"). The relevant tool will load inline and you can call it on the next iteration.

Memory: anything durable about this curator across sessions lives in /memories/<curator_id>/. The Memory tool gives you view / create / str_replace / insert / delete / rename. Use it sparingly — write what would change the NEXT peek they build. Prefer the higher-level set_curator_memory tool for simple key/value facts.

Extended thinking: for the hardest creative jobs (note drafting, complex rules trees, recipient disambiguation), call request_extended_thinking BEFORE the heavy tool on the same turn. Burns latency — never use in voice mode.

Big uploads: if the curator drops a >10MB file (photo album, PDF, voice memo), it lands via /api/upload/anthropic and gets a file_id in peeks.metadata.uploaded_files[]. Reference it via attach_files_api_ref — saves re-uploading on every turn.
```

### 9. Telemetry

Per packet 25/34 observability conventions, add `track()` calls for:

- `memory.command` — fires per Memory tool dispatch. Payload: `{ command, path_prefix, ok, error_code }`.
- `web_search.completed` — fires when `web_search_tool_result` blocks appear in finalMessage. Payload: `{ query_count, result_count, error_code }`.
- `extended_thinking.requested` — fires per request_extended_thinking call. Payload: `{ reason, sessionId, peekId }`.
- `files_api.upload` — fires per successful Files API upload. Payload: `{ purpose, mime, size_bytes, file_id }`.
- `tool_search.called` — fires per tool_search_tool_bm25 dispatch (Anthropic-side; emit when we see the corresponding tool_use block). Payload: `{ query, results_returned }`.

The chat route's existing `chat_turn` event already aggregates per-turn tokens. The new events are PER-EVENT, not aggregated.

### 10. CURATOR_PROMPT.md verification (sequencing)

CURATOR_PROMPT.md is the SPINE source of truth. It mentions `{curator_memory}` interpolation. This packet makes that real. If CURATOR_PROMPT contradicts what we wire here, ORCHESTRATOR resolves — file a follow-up to CURATOR_PROMPT, do NOT diverge silently.

DO NOT modify CURATOR_PROMPT.md in this packet. Just verify the touch points line up.

---

## Test plan

### Server-tool descriptors

```bash
# Verify the descriptors land in messages.create.
cd atelier
node -e '
const { getServerToolDescriptors } = require("./.next/server/lib/anthropic/server-tools");
console.log(JSON.stringify(getServerToolDescriptors(), null, 2));
'
# Expect 4 entries: code_execution_20260120, web_search_20260209, web_fetch_20260209, tool_search_tool_bm25_20251119
```

OR (simpler — typecheck only): run typecheck. If `Anthropic.MessageCreateParams['tools']` accepts your descriptors, you're shape-correct.

### Web Search (live curl)

```bash
# Hit chat route with a curator question that triggers web_search.
curl -X POST https://peek-gift-vnext.netlify.app/api/chat \
  -H 'content-type: application/json' \
  --data '{
    "peekId": "<a-test-peek-uuid>",
    "sessionId": "smoke-test-1",
    "history": [],
    "userMessage": "Stanley Quencher H2.0 in pool — current price?"
  }'
# Watch SSE stream for tool_call events naming web_search.
# If the curator's Anthropic admin hasn't enabled web search:
#   Expect a tool_result error: "web_search_tool_result_error" with error_code "unavailable".
#   Surface in Sentry as `web_search_admin_disable_required`.
```

### Memory tool (curl + DB inspect)

```bash
# Trigger Peek to write memory.
curl -X POST .../api/chat --data '{
  "peekId": "<uuid>",
  "sessionId": "memory-smoke-1",
  "history": [],
  "userMessage": "Remember that my sister Hannah is allergic to nuts and her birthday is May 12."
}'
# Watch for tool_call(name: memory) events.
# Inspect DB:
psql "$DATABASE_URL" -c "select clerk_user_id, path, size_bytes, updated_at from peek_v2.curator_memory order by updated_at desc limit 10;"
# Expect a row at path /memories/<clerk_user_id>/recipients/hannah.md (or similar — Peek picks).

# Next session — verify recall.
curl ... --data '{
  "peekId": "<a-different-uuid-same-curator>",
  "sessionId": "memory-smoke-2",
  "history": [],
  "userMessage": "I want to build something for Hannah for her birthday next month."
}'
# Peek's response should reference the nut allergy unprompted, sourced from memory.
```

### Path-traversal attack (negative test)

Construct a malicious tool_use input bypassing Claude (e.g. via a unit test that calls `buildMemoryHandler(...).handlers.create({command:'create', path:'/memories/<other_user>/secret.md', file_text:'pwned'})`):

```ts
import { describe, it, expect } from 'vitest';
import { buildMemoryHandler } from '@/lib/anthropic/memory/store';

describe('memory path traversal', () => {
  it('rejects cross-user writes', async () => {
    const h = buildMemoryHandler({ clerkUserId: 'user_aaa' });
    await expect(
      h.handlers.create({ command: 'create', path: '/memories/user_bbb/x.md', file_text: 'pwn' })
    ).rejects.toThrow(/outside_namespace/);
  });
  it('rejects URL-encoded traversal', async () => {
    const h = buildMemoryHandler({ clerkUserId: 'user_aaa' });
    await expect(
      h.handlers.create({ command: 'create', path: '/memories/user_aaa/%2e%2e/escape.md', file_text: 'pwn' })
    ).rejects.toThrow(/encoded_traversal/);
  });
  it('rejects parent segments', async () => {
    const h = buildMemoryHandler({ clerkUserId: 'user_aaa' });
    await expect(
      h.handlers.create({ command: 'create', path: '/memories/user_aaa/../user_bbb/x.md', file_text: 'pwn' })
    ).rejects.toThrow(/parent_segment/);
  });
});
```

Add these to `atelier/lib/anthropic/memory/store.test.ts`. Run with `npm run test`.

### Files API upload

```bash
# Multipart upload to the new endpoint.
curl -X POST 'https://.../api/upload/anthropic?peekId=<uuid>&purpose=recipient_pdf' \
  -F 'file=@/path/to/sample.pdf'
# Expect { ok: true, file_id: "file_...", original_name: "sample.pdf", mime: "application/pdf", size_bytes: <n> }
# Then verify peeks.metadata.uploaded_files[] has the entry.
psql ... -c "select metadata->'uploaded_files' from peek_v2.peeks where id = '<uuid>';"
```

### Files API attach (smoke via chat)

```bash
# Curator chats: "I just uploaded a PDF of her wishlist — pull from that."
# Peek calls attach_files_api_ref({ file_id: "...", purpose: "recipient_pdf" })
# Next user-turn from curator: the PDF should appear as a document block in the messages array sent to Anthropic.
# Verify via stream inspection — server-side, log the messages.create payload before sending.
```

### Extended Thinking smoke

```bash
# Trigger Peek into a note-drafting moment.
curl ... --data '{
  ...,
  "userMessage": "Help me write the note. She is my best friend Maya, we have been through everything together for 15 years, and this is for her 40th."
}'
# Watch for: tool_call(name: request_extended_thinking) followed by tool_call(name: set_note).
# The SSE stream should include thinking_delta events on the next iteration (per streaming.ts:10).
```

### Tool search + deferred load smoke

```bash
# Curator wants a song card; the tool is deferred.
curl ... --data '{
  ...,
  "userMessage": "Add her favorite Taylor Swift song to the page."
}'
# Peek should issue tool_search_tool_bm25 with a query like "add song card spotify".
# Anthropic returns the set_song_card tool_reference inline.
# Peek calls set_song_card — gets back our `not_implemented_yet` stub response (until packet for Spotify lands).
# Verify in PostHog: tool_search.called event with results_returned = 1 (set_song_card).
```

### CURATOR_PROMPT verification

Inspect the first chat request's `messages.create` payload:

```ts
// Add a debug log in chat.ts iteration, gated on env.NODE_ENV === 'development':
if (env.NODE_ENV === 'development') {
  const sysText = system.map(b => b.text).join('\n---\n');
  log.debug('system_prompt_assembled', {
    length: sysText.length,
    has_tool_search_bullet: sysText.includes('tool_search_tool_bm25'),
    has_memory_bullet: sysText.includes('/memories/'),
    has_thinking_bullet: sysText.includes('request_extended_thinking'),
  });
}
```

Run `npm run dev`, open the chat, send a message. Verify all three bullets appear.

### `npm run build`

Final gate: full build green. No `any`, no `as unknown as`. Run `npm run typecheck` after the build to confirm no type drift.

---

## Constraints

- TS strict. No `any` (use `Anthropic.MessageCreateParams['tools'][number]` for the descriptor type if needed). No `@ts-ignore`. The one cast permitted is the `defer_loading` field on `Anthropic.Tool` IF the SDK alias doesn't include it (see §6 — document in NOTES.md if you had to cast).
- The Anthropic SDK helpers (`betaMemoryTool`) are TYPED. Use them. Don't hand-roll the command-narrowing — it's brittle.
- The Memory tool's error message strings must MATCH the Anthropic spec EXACTLY. Claude is trained on the strings; deviation breaks recovery flows.
- Anon curators (`ctx.userId === null`): Memory tool fails gracefully with a SHORT string like `Error: Memory requires sign-in.` (not JSON — string per Memory protocol). The `set_curator_memory` façade returns `{ ok: false, error: 'unauthorized' }` JSON.
- Use Drizzle ORM for the new schema (`atelier/db/schema/curator_memory.ts`). The Memory store can also use Supabase service-role client directly (faster than Drizzle for ad-hoc queries) — either is fine; pick consistent across the file.
- Migration file MUST be named `0013_curator_memory.sql` (next number after `0012_users_email_nullable.sql` in `atelier/db/migrations/`). Copy contents from `_packets/41-anthropic-surface/migration.sql` verbatim.
- NO new env vars are REQUIRED. The optional ones (WEB_SEARCH_MAX_USES etc.) all `.optional()` with sane defaults at call site.
- The `app/api/upload/anthropic/route.ts` endpoint MUST be added to `proxy.ts` public-routes list (it uses session-cookie auth like the existing `/api/upload`, NOT Clerk session — same pattern). Reuse the `assertPeekAccess` guard.
- Code only. No narrative comments. WHY comments (subtle invariants — memory error strings, path traversal guard rationale) go in `_packets/COMMENTS.md` per protocol.

---

## Worker briefing

**Workspace check:** before writing any file, run `pwd` and confirm you are inside `.claude/worktrees/agent-*/`. Files written outside the worktree leak into the parent.

**Use sub-agents:** this packet has parallel work surfaces. Recommended fan-out:
- Sub-agent A — Memory tool: `lib/anthropic/memory/{store,paths}.ts`, `db/schema/curator_memory.ts`, `db/migrations/0013_curator_memory.sql`, `lib/anthropic/tools/{memory.ts,set_curator_memory.ts}`, vitest tests.
- Sub-agent B — Server tools + tool_search + Extended Thinking: `lib/anthropic/server-tools.ts`, `lib/anthropic/extended-thinking.ts`, `lib/anthropic/tools/request_extended_thinking.ts`, modifications to `lib/anthropic/chat.ts` (tools array + thinking flag) + `lib/anthropic/tools/index.ts` (deferLoading field).
- Sub-agent C — Files API: `lib/anthropic/files-api.ts`, modifications to `lib/anthropic/client.ts`, `app/api/upload/anthropic/route.ts`, `lib/anthropic/tools/attach_files_api_ref.ts`, chat route attach-injection block.
- Sub-agent D — Stub tools (17 stubs): one file each per TOOL_MANIFEST spec, plus alphabetized bootstrap.ts updates and deferLoading flips on existing tools (set_hero_image, generate_hero_image, add_variant_group, remove_card, reorder_cards, scrape_url, update_card all flip to deferLoading: true).
- Sub-agent E — System prompt + chat route plumbing: `lib/anthropic/system-prompt.ts` interpolation extensions + curator-memory load, telemetry events, env.ts optional additions.

Each sub-agent should typecheck before returning. Integration of all 5 happens at the outer worker's branch.

**Surface ambiguities in NOTES.md, not in the chat.** The packet leaves a few open implementation choices (defer_loading SDK cast, audio file injection format, memory file count enforcement timing). Pick the safer/simpler path and document the choice.

**Reply minimally.** Branch name + commit hash + 2 sentences max + any NOTES.md key takeaway.

**Don't proactively sign up for any service.** No new accounts. The 4 server tools, Memory, Files API, Extended Thinking, tool_search all ride on the existing `ANTHROPIC_API_KEY` and the existing Supabase project. Anthropic admin's web-search enable is Frank's task post-merge.
