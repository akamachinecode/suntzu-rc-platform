/**
 * The API's own message for a refused request (a 4xx `message`), or `fallback` when there's none or
 * the API failed (5xx): people see what they can fix, never a server error's details.
 *
 * Pass the whole result of the typed client (`await api.POST(…)`): it has already read the body into
 * `error`, so the response can't be read again (that's how these messages were lost before 2026-11-18).
 */
export function apiErrorText(
  result: { error?: unknown; response: Response },
  fallback: string,
): string {
  const body = result.error as { message?: string | string[] } | undefined;
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return typeof message === "string" && message && result.response.status < 500
    ? message
    : fallback;
}
