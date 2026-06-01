// Anthropic client + live/preview detection. The route runs the real model when
// ANTHROPIC_API_KEY is present and the scripted preview driver otherwise, so the
// build boots and demos with zero secrets.

import Anthropic from "@anthropic-ai/sdk";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getClient(): Anthropic {
  // Resolves ANTHROPIC_API_KEY from the environment.
  return new Anthropic();
}

export const PEEK_MODEL = "claude-opus-4-8";
