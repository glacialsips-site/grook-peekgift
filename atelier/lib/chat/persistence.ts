import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { chatMessages, type ChatMessage } from '@/db/schema/chat_history';

export type ChatRole = 'user' | 'assistant' | 'tool_result';

export async function loadChatHistory(peekId: string): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.peekId, peekId))
    .orderBy(asc(chatMessages.createdAt));
}

export interface AppendChatMessageInput {
  peekId: string;
  role: ChatRole;
  content: unknown;
  toolCallId?: string;
}

export async function appendChatMessage(
  input: AppendChatMessageInput,
): Promise<void> {
  await db.insert(chatMessages).values({
    peekId: input.peekId,
    role: input.role,
    content: input.content,
    toolCallId: input.toolCallId ?? null,
  });
}

export interface ChatHistoryEntry {
  role: ChatRole;
  content: unknown;
  toolCallId: string | null;
  createdAt: string;
}

export function serializeHistory(rows: ChatMessage[]): ChatHistoryEntry[] {
  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    toolCallId: r.toolCallId ?? null,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
  }));
}
