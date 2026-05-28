import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './client';

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
