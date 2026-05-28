import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './client';

// Thin wrapper around the Anthropic Files API. The `anthropic` client has
// `defaultHeaders: { 'anthropic-beta': 'files-api-2025-04-14' }` set globally
// in lib/anthropic/client.ts — the beta header is benign for non-files
// endpoints and avoids per-call boilerplate.
//
// Files API is used for "big" curator uploads (>10MB, PDFs, voice memos)
// that we don't want to base64-shuttle on every turn. The Files API
// returns a stable `file_id` we reference via:
//   { type: 'image', source: { type: 'file', file_id } }
// or
//   { type: 'document', source: { type: 'file', file_id } }
// in subsequent message bodies. The attach_files_api_ref tool records
// intent in peeks.metadata.active_attached_file_ids[]; the chat route
// drains the list into the next user-turn content array.

export async function uploadToFilesApi(
  file: File,
): Promise<Anthropic.Beta.FileMetadata> {
  return anthropic.beta.files.upload({ file });
}

export async function retrieveFileMetadata(
  fileId: string,
): Promise<Anthropic.Beta.FileMetadata> {
  return anthropic.beta.files.retrieveMetadata(fileId);
}

export async function deleteFile(fileId: string): Promise<void> {
  await anthropic.beta.files.delete(fileId);
}
