/**
 * The API's own message for a refused request (a 4xx `message`), or `fallback` when there's none or
 * the API failed (5xx): people see what they can fix, never a server error's details.
 */
export async function apiErrorText(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.clone().json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    return message && response.status < 500 ? message : fallback;
  } catch {
    return fallback;
  }
}
