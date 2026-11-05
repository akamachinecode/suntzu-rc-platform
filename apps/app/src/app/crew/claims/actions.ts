"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApi } from "@/lib/api";

const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);

export async function decideClaim(host: string, user: string, approve: boolean): Promise<void> {
  if (!slug.safeParse(host).success || !/^[\w-]{1,64}$/.test(user)) return;
  const api = await getApi();
  await api.POST("/crew/claims/{host}/{user}/{decision}", {
    params: { path: { host, user, decision: approve ? "approve" : "reject" } },
  });
  revalidatePath("/crew/claims");
}

export async function markTrySent(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const api = await getApi();
  await api.POST("/crew/try/{id}/sent", { params: { path: { id } } });
  revalidatePath("/crew/claims");
}
