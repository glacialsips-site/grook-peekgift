type ClerkErrorShape = {
  errors?: Array<{
    code?: string;
    message?: string;
    longMessage?: string;
  }>;
  message?: string;
};

const CODE_MESSAGES: Record<string, string> = {
  form_identifier_not_found: "We don't recognize that email.",
  form_identifier_exists: 'That email is already in use. Try signing in.',
  form_password_incorrect: 'Wrong password. Try again or use a code.',
  form_password_pwned:
    "That password has shown up in a breach. Pick a different one.",
  form_password_length_too_short: 'Password is too short.',
  form_password_validation_failed: "That password doesn't meet our rules.",
  form_param_format_invalid: "That doesn't look right. Check the format.",
  form_param_format_invalid__email_address:
    'Enter a valid email address.',
  form_param_nil: 'Please fill in that field.',
  form_code_incorrect: "That code didn't work. Try again or resend.",
  verification_failed: "That code didn't work. Try again or resend.",
  verification_expired: 'Your code expired. Send a new one.',
  verification_already_verified: 'That email is already verified.',
  too_many_requests:
    "You're going a little fast. Wait a minute and try again.",
  session_exists: "You're already signed in.",
  client_state_invalid: 'Refresh the page and try again.',
  network_error: 'Network error. Check your connection and retry.',
  captcha_invalid: "Couldn't verify you're human. Refresh and try again.",
  oauth_access_denied: 'Sign-in was cancelled.',
  oauth_callback_invalid: 'Sign-in failed. Try again.',
  external_account_not_found: 'That account is not connected yet.',
};

export function parseClerkError(e: unknown): string {
  if (typeof e === 'string' && e.trim().length > 0) return e;
  if (!e || typeof e !== 'object') return 'Something went wrong. Try again.';
  const err = e as ClerkErrorShape;
  const first = err.errors?.[0];
  if (first?.code) {
    const mapped = CODE_MESSAGES[first.code];
    if (mapped) return mapped;
  }
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  if (err.message) return err.message;
  return 'Something went wrong. Try again.';
}
