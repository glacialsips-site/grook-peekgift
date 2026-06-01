import { describe, expect, it } from 'vitest';
import { classifyUpstreamError } from '@/app/api/chat/route';

describe('classifyUpstreamError — keeps raw provider errors out of chat bubbles', () => {
  it('maps Anthropic 400 to a friendly hiccup message', () => {
    const err = Object.assign(
      new Error(
        '400 {"type":"error","error":{"type":"invalid_request_error","message":"messages.5: `tool_use` ids were found without `tool_result` blocks immediately after"}}',
      ),
      { status: 400 },
    );
    const out = classifyUpstreamError(err);
    expect(out.user_message).not.toContain('tool_use');
    expect(out.user_message).not.toContain('{');
    expect(out.user_message).toMatch(/hiccup|refresh|try again/i);
    expect(out.internal_message).toContain('tool_use');
  });

  it('maps Anthropic 5xx to the existing upstream message', () => {
    const err = Object.assign(new Error('upstream blew up'), { status: 503 });
    const out = classifyUpstreamError(err);
    expect(out.user_message).toMatch(/trouble connecting/i);
  });

  it('catches tool_use leakage even when status is missing', () => {
    const err = new Error(
      'messages.0.content.5: `tool_use` ids were found without `tool_result` blocks immediately after',
    );
    const out = classifyUpstreamError(err);
    expect(out.user_message).not.toContain('tool_use');
    expect(out.user_message).toMatch(/hiccup/i);
  });

  it('rewrites raw JSON-shaped error bodies to a friendly message', () => {
    const err = new Error(
      '{"type":"error","error":{"type":"invalid_request_error","message":"bad"}}',
    );
    const out = classifyUpstreamError(err);
    expect(out.user_message).not.toMatch(/^[\[{]/);
    expect(out.user_message).toMatch(/hiccup/i);
  });

  it('passes through innocuous plain-text errors unchanged', () => {
    const err = new Error('curator aborted');
    const out = classifyUpstreamError(err);
    expect(out.user_message).toBe('curator aborted');
  });
});
