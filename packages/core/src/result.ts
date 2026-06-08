export { ok, err, Result, ResultAsync, okAsync, errAsync } from "neverthrow";

export type CoreErrorCode =
  | "VALIDATION"
  | "INVARIANT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT";

export interface CoreError {
  readonly code: CoreErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export function coreError(
  code: CoreErrorCode,
  message: string,
  details?: unknown,
): CoreError {
  return details === undefined ? { code, message } : { code, message, details };
}
