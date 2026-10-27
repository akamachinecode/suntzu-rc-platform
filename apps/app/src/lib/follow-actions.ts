"use server";

import { followKey, type FollowKey, type ViewerState } from "@workspace/shared";
import { getApi } from "@/lib/api";

// Follow and "going" from any page. Public pages stay cached for everyone; these run per visitor.
// `null` means "not signed in": the button then links to /sign-in.

export async function viewerState(key: FollowKey): Promise<ViewerState | null> {
  const parsed = followKey.safeParse(key);
  if (!parsed.success) return null;
  const api = await getApi();
  const { data, response } = await api.GET("/me/state/{target}/{id}", {
    params: { path: parsed.data },
  });
  if (response.status === 401) return null;
  return data ?? { following: false, going: false };
}

export async function setFollow(key: FollowKey, on: boolean): Promise<ViewerState | null> {
  const parsed = followKey.safeParse(key);
  if (!parsed.success) return null;
  const api = await getApi();
  const { data } = await (on ? api.PUT : api.DELETE)("/me/follows/{target}/{id}", {
    params: { path: parsed.data },
  });
  return data ?? null;
}

export async function setGoing(slug: string, on: boolean): Promise<ViewerState | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const api = await getApi();
  const { data } = await (on ? api.PUT : api.DELETE)("/me/going/{slug}", {
    params: { path: { slug } },
  });
  return data ?? null;
}
