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
  const cookie = (await headers()).get("cookie") ?? "";
  return createApiClient({ baseUrl: env.API_URL, headers: { cookie }, cache: "no-store" });
}
