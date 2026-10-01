const GENERIC_MESSAGE = 'Something went wrong. Please try again.'
const NETWORK_MESSAGE = 'No connection. Check your internet and try again.'
// Chrome: "Failed to fetch", Safari: "Load failed", Firefox: "NetworkError…"
const NETWORK_PATTERN = /failed to fetch|load failed|networkerror/i

const KNOWN_MESSAGES: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, 'Wrong email or password.'],
  [/already registered/i, 'An account with this email already exists. Try logging in.'],
  [/email not confirmed/i, 'Please confirm your email first. Check your inbox.'],
  [/signups? not allowed/i, 'Sign-ups are closed for this app.'],
  [/rate limit/i, 'Too many attempts. Please wait a minute and try again.'],
  [/already in a household/i, 'You are already in a household.'],
  [/invalid invite code/i, 'That invite code doesn’t match any household.'],
]

/** An error returned by Supabase (PostgREST/RPC), kept as a real Error with its SQLSTATE code. */
export class ApiError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }

  static from(error: { readonly message: string; readonly code?: string }): ApiError {
    return new ApiError(error.message, error.code)
  }
}

export function toUserMessage(error: unknown): string {
  if (!(error instanceof Error)) return GENERIC_MESSAGE
  if (NETWORK_PATTERN.test(error.message)) return NETWORK_MESSAGE
  const known = KNOWN_MESSAGES.find(([pattern]) => pattern.test(error.message))
  return known ? known[1] : GENERIC_MESSAGE
}
