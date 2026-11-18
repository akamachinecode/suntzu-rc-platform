"use server";

import { airspaceQuery, type AirspaceCheck } from "@workspace/shared";
import { createApiClient } from "@workspace/api-client";
import { env } from "@/lib/env";

/** Checks one point. Nothing is cached or kept: the point is only used to answer. */
export async function checkPoint(
  lat: number,
  lng: number,
): Promise<AirspaceCheck | "outside" | "error"> {
  const parsed = airspaceQuery.safeParse({ lat, lng });
  if (!parsed.success) return "outside";
  const api = createApiClient({ baseUrl: env.API_URL, cache: "no-store" });
  const { data } = await api.GET("/airspace/check", {
    params: { query: { lat: parsed.data.lat, lng: parsed.data.lng } },
  });
  return data ?? "error";
}
