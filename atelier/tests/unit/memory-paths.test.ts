import { describe, expect, it } from 'vitest';
import { prefixForUser, validatePath } from '@/lib/anthropic/memory/paths';

const USER = 'user_abc123';

describe('memory validatePath', () => {
  it('resolves /memories (root) to the curator namespace', () => {
    expect(validatePath(USER, '/memories')).toBe(prefixForUser(USER));
  });

  it('resolves /memories/<user> (no trailing slash) to the curator namespace', () => {
    expect(validatePath(USER, `/memories/${USER}`)).toBe(prefixForUser(USER));
  });

  it('resolves /memories/<user>/ (with trailing slash) to the curator namespace', () => {
    expect(validatePath(USER, `/memories/${USER}/`)).toBe(prefixForUser(USER));
  });

  it("rejects another user's namespace with outside_namespace", () => {
    expect(() => validatePath(USER, '/memories/other_user/')).toThrowError(
      /outside_namespace/,
    );
  });

  it('rejects parent-segment traversal', () => {
    expect(() => validatePath(USER, '/memories/../etc/passwd')).toThrowError(
      /parent_segment|outside_namespace/,
    );
  });

  it('rejects URL-encoded traversal (%2e%2e%2f) with encoded_traversal', () => {
    expect(() => validatePath(USER, '%2e%2e%2f')).toThrowError(
      /encoded_traversal/,
    );
  });
});
