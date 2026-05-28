// Every memory file must live under /memories/<clerk_user_id>/...
// validatePath() enforces this at the app layer for structured errors the
// model can recover from; CHECK constraints in migration 0013 are the
// hard backstop against cross-tenant writes.

export function prefixForUser(clerkUserId: string): string {
  return `/memories/${clerkUserId}/`;
}

export function validatePath(clerkUserId: string, raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('memory_invalid_path: empty');
  }
  // %2e %2f %5c — block URL-encoded path traversal.
  const lc = raw.toLowerCase();
  if (lc.includes('%2e') || lc.includes('%2f') || lc.includes('%5c')) {
    throw new Error('memory_invalid_path: encoded_traversal');
  }
  const normalized = raw.replace(/\/+/g, '/');
  const expected = prefixForUser(clerkUserId);
  const expectedNoTrailing = expected.replace(/\/$/, '');

  // Anthropic's Memory tool calls `view` on /memories — treat that and
  // /memories/<user> (no trailing slash) as this user's namespace root.
  if (normalized === '/memories' || normalized === '/memories/') {
    return expected;
  }
  if (normalized === expectedNoTrailing) {
    return expected;
  }
  if (!normalized.startsWith(expected)) {
    throw new Error(
      `memory_invalid_path: outside_namespace (got ${normalized}, expected prefix ${expected})`,
    );
  }
  if (normalized.includes('..')) {
    throw new Error('memory_invalid_path: parent_segment');
  }
  if (!/^[/A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error('memory_invalid_path: invalid_chars');
  }
  return normalized;
}
