import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { validatePath, prefixForUser } from './paths';

// Anthropic Memory tool (`memory_20250818`) backing store. The model emits
// `tool_use` blocks with one of six commands; we own the storage.
//
// CRITICAL: the error-message strings here MUST match Anthropic's spec
// EXACTLY. The model is trained on the specific phrasings ("Error: File
// not found", "File created successfully at: <path>") — deviating breaks
// the model's ability to recover. Treat them as protocol.

type MemoryCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818Command;
type ViewCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818ViewCommand;
type CreateCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818CreateCommand;
type StrReplaceCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818StrReplaceCommand;
type InsertCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818InsertCommand;
type DeleteCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818DeleteCommand;
type RenameCommand = Anthropic.Beta.Messages.BetaMemoryTool20250818RenameCommand;

const MEMORY_NOT_FOUND_MSG = 'Error: File not found';

export interface MemoryHandlerContext {
  clerkUserId: string;
}

export interface MemoryHandlers {
  view: (cmd: ViewCommand) => Promise<string>;
  create: (cmd: CreateCommand) => Promise<string>;
  str_replace: (cmd: StrReplaceCommand) => Promise<string>;
  insert: (cmd: InsertCommand) => Promise<string>;
  delete: (cmd: DeleteCommand) => Promise<string>;
  rename: (cmd: RenameCommand) => Promise<string>;
}

function memoryLimits(): { maxFiles: number; maxBytes: number } {
  return {
    maxFiles: env.MEMORY_MAX_FILES_PER_CURATOR ?? 100,
    maxBytes: (env.MEMORY_MAX_FILE_KB ?? 50) * 1024,
  };
}

async function rowExists(
  sb: ReturnType<typeof getSupabaseService>,
  userId: string,
  path: string,
): Promise<boolean> {
  const { count } = await sb
    .from('curator_memory')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_user_id', userId)
    .eq('path', path);
  return (count ?? 0) > 0;
}

export function buildMemoryHandler(ctx: MemoryHandlerContext): MemoryHandlers {
  if (!ctx.clerkUserId) {
    throw new Error('memory_unavailable_anon');
  }
  const sb = getSupabaseService();
  const userId = ctx.clerkUserId;
  const { maxFiles, maxBytes } = memoryLimits();

  const handlers: MemoryHandlers = {
    view: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      const exists = await rowExists(sb, userId, path);
      const isDir = path.endsWith('/') || !exists;
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
          return `Directory contents of ${path}:\n(empty)`;
        }
        const lines = data.map(
          (r) => `${r.path}  (${r.size_bytes} bytes, ${r.updated_at})`,
        );
        return `Directory contents of ${path}:\n${lines.join('\n')}`;
      }
      const { data, error } = await sb
        .from('curator_memory')
        .select('content')
        .eq('clerk_user_id', userId)
        .eq('path', path)
        .maybeSingle();
      if (error) throw new Error(`memory_read_failed: ${error.message}`);
      if (!data) return MEMORY_NOT_FOUND_MSG;
      const lines = (data.content ?? '').split('\n');
      if (cmd.view_range && cmd.view_range.length === 2) {
        const [start, end] = cmd.view_range;
        if (typeof start !== 'number' || typeof end !== 'number') {
          return `Error: invalid view_range`;
        }
        const sliced = lines.slice(Math.max(start - 1, 0), end);
        return sliced
          .map((l, i) => `${String(start + i).padStart(6, ' ')}\t${l}`)
          .join('\n');
      }
      return lines
        .map((l, i) => `${String(i + 1).padStart(6, ' ')}\t${l}`)
        .join('\n');
    },

    create: async (cmd) => {
      const path = validatePath(userId, cmd.path);
      const sizeBytes = Buffer.byteLength(cmd.file_text, 'utf8');
      if (sizeBytes > maxBytes) {
        return `Error: File too large (${sizeBytes} bytes, max ${maxBytes})`;
      }
      const { count, error: countErr } = await sb
        .from('curator_memory')
        .select('*', { count: 'exact', head: true })
        .eq('clerk_user_id', userId);
      if (countErr) throw new Error(`memory_count_failed: ${countErr.message}`);
      const existing = await rowExists(sb, userId, path);
      if (!existing && (count ?? 0) >= maxFiles) {
        return `Error: Memory file limit reached (${maxFiles}). Delete a file first.`;
      }
      const nowIso = new Date().toISOString();
      const { error } = await sb.from('curator_memory').upsert({
        clerk_user_id: userId,
        path,
        content: cmd.file_text,
        size_bytes: sizeBytes,
        updated_at: nowIso,
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
      const content = data.content ?? '';
      const occurrences = content.split(cmd.old_str).length - 1;
      if (occurrences === 0) {
        return `Error: No match found for old_str`;
      }
      if (occurrences > 1) {
        return `Error: Multiple matches found for old_str (${occurrences}). Provide a more specific old_str.`;
      }
      const next = content.replace(cmd.old_str, cmd.new_str);
      const sizeBytes = Buffer.byteLength(next, 'utf8');
      if (sizeBytes > maxBytes) {
        return `Error: File too large after replace (${sizeBytes} bytes, max ${maxBytes})`;
      }
      const { error } = await sb
        .from('curator_memory')
        .update({
          content: next,
          size_bytes: sizeBytes,
          updated_at: new Date().toISOString(),
        })
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
      const lines = (data.content ?? '').split('\n');
      if (cmd.insert_line < 0 || cmd.insert_line > lines.length) {
        return `Error: insert_line out of range (file has ${lines.length} lines)`;
      }
      lines.splice(cmd.insert_line, 0, cmd.insert_text);
      const next = lines.join('\n');
      const sizeBytes = Buffer.byteLength(next, 'utf8');
      if (sizeBytes > maxBytes) {
        return `Error: File too large after insert (${sizeBytes} bytes, max ${maxBytes})`;
      }
      const { error } = await sb
        .from('curator_memory')
        .update({
          content: next,
          size_bytes: sizeBytes,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', userId)
        .eq('path', path);
      if (error) throw new Error(`memory_update_failed: ${error.message}`);
      return `Successfully inserted text at line ${cmd.insert_line} in ${path}`;
    },

    delete: async (cmd) => {
      const path = validatePath(userId, cmd.path);
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
      const { error: upErr } = await sb.from('curator_memory').upsert({
        clerk_user_id: userId,
        path: newPath,
        content: data.content ?? '',
        size_bytes: data.size_bytes ?? 0,
        updated_at: new Date().toISOString(),
      });
      if (upErr) throw new Error(`memory_rename_failed: ${upErr.message}`);
      const { error: delErr } = await sb
        .from('curator_memory')
        .delete()
        .eq('clerk_user_id', userId)
        .eq('path', oldPath);
      if (delErr) throw new Error(`memory_rename_failed: ${delErr.message}`);
      return `Successfully renamed ${oldPath} to ${newPath}`;
    },
  };

  return handlers;
}

export async function dispatchMemoryCommand(
  ctx: MemoryHandlerContext,
  cmd: MemoryCommand,
): Promise<string> {
  const handlers = buildMemoryHandler(ctx);
  switch (cmd.command) {
    case 'view':
      return handlers.view(cmd);
    case 'create':
      return handlers.create(cmd);
    case 'str_replace':
      return handlers.str_replace(cmd);
    case 'insert':
      return handlers.insert(cmd);
    case 'delete':
      return handlers.delete(cmd);
    case 'rename':
      return handlers.rename(cmd);
    default: {
      const _exhaustive: never = cmd;
      void _exhaustive;
      return `Error: Unknown memory command`;
    }
  }
}

export { MEMORY_NOT_FOUND_MSG, prefixForUser };
