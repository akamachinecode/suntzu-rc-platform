import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// Written once at build time as a static file: the portal has no server.
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, { language: "english" });
