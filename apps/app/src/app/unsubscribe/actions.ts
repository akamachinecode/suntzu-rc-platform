"use server";

import { createApiClient } from "@workspace/api-client";
import { env } from "@/lib/env";

const KINDS = ["alerts", "digest", "report"] as const;

export async function unsubscribe(token: string, what: string): Promise<"done" | "error"> {
  const kind = KINDS.find((value) => value === what);
  if (!/^[\w-]{20,64}$/.test(token) || !kind) return "error";
  const api = createApiClient({ baseUrl: env.API_URL, cache: "no-store" });
  const { response } = await api.POST("/unsubscribe", { params: { query: { token, what: kind } } });
  return response.ok ? "done" : "error";
}
