// Path validation + namespacing for the Anthropic Memory tool's virtual
// filesystem. Every file lives under /memories/<clerk_user_id>/... — the
// handler enforces this via validatePath() before any DB read/write so a
// malicious or hallucinated tool_use input can't cross user boundaries.
//
// Defense-in-depth pairs with the table's CHECK constraints
// (curator_memory_path_format_chk + curator_memory_no_traversal_chk in
// migration 0013): app-layer guard for fast structured errors that the model
// can recover from, DB-layer guard as a hard backstop.

export function prefixForUser(clerkUserId: string): string {
  return `/memories/${clerkUserId}/`;
}

export function validatePath(clerkUserId: string, raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('memory_invalid_path: empty');
  }
  // Reject URL-encoded traversal up front (case-insensitive on hex digits).
  const lc = raw.toLowerCase();
  if (lc.includes('%2e') || lc.includes('%2f') || lc.includes('%5c')) {
    throw new Error('memory_invalid_path: encoded_traversal');
  }
  // Collapse double-slashes, normalize.
  const normalized = raw.replace(/\/+/g, '/');
  const expected = prefixForUser(clerkUserId);
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
