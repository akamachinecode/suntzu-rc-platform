import createClient, { type ClientOptions } from "openapi-fetch";
import type { components, paths } from "./schema.js";

/**
 * Typed client for the API. Paths, parameters and responses come from apps/api/openapi.json, so a
 * change in the API that breaks a caller is a type error here, not a bug in production.
 *
 *   const api = createApiClient({ baseUrl: "https://api.suntzurc.com" });
 *   const { data, error } = await api.GET("/notes");
 */
export function createApiClient(options: ClientOptions) {
  return createClient<paths>(options);
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type { components, paths };
