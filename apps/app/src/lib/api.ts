import "server-only";
import { createApiClient } from "@workspace/api-client";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * API client for Server Components and Server Actions. It forwards the visitor's cookies, so the
 * API sees the signed-in user. All data comes from apps/api: this app never touches the database.
 *
 *   const api = await getApi();
 *   const { data, error } = await api.GET("/notes");
 */
export async function getApi() {
  const incoming = await headers();
  // One trace ID per page request, so the API's log lines can be matched to it.
  const requestId = incoming.get("x-request-id") ?? incoming.get("cf-ray") ?? crypto.randomUUID();
  return createApiClient({
    baseUrl: env.API_URL,
    headers: { cookie: incoming.get("cookie") ?? "", "x-request-id": requestId },
    cache: "no-store",
  });
}

/**
 * API client for public data (events, places) that is the same for every visitor: it sends no
 * cookies, so responses can be cached for a few minutes across visitors. It sends no trace ID
 * either: headers are part of the fetch cache key, and a new ID per request would defeat the cache.
 * The API still gives each of these requests its own ID in its logs.
 */
export function getPublicApi() {
  return createApiClient({ baseUrl: env.API_URL, next: { revalidate: 300 } });
}
