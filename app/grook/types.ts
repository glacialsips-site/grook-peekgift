export type TextBlock = { type: 'text'; text: string };

export type ImageBlock = {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
};

export type ContentBlock = TextBlock | ImageBlock;

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: ContentBlock[];
  pending?: boolean;
};

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type Attachment = {
  id: string;
  dataUrl: string;
  mediaType: string;
  base64: string;
  name?: string;
};
