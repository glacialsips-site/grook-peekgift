export function prefixForUser(clerkUserId: string): string {
  return `/memories/${clerkUserId}/`;
}

export function validatePath(clerkUserId: string, raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('memory_invalid_path: empty');
  }
  const lc = raw.toLowerCase();
  if (lc.includes('%2e') || lc.includes('%2f') || lc.includes('%5c')) {
    throw new Error('memory_invalid_path: encoded_traversal');
  }
  const normalized = raw.replace(/\/+/g, '/');
  const expected = prefixForUser(clerkUserId);
  const expectedNoTrailing = expected.replace(/\/$/, '');

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
