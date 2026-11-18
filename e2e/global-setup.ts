import { mkdirSync } from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";
import { CREW_EMAIL, CREW_STATE } from "./env.ts";
import { signIn } from "./people.ts";

// Runs once, after Playwright has started both apps: signs the crew in and saves the session, so
// crew tests reuse it. Signing the same address in from several tests at once would race (each new
// email replaces the previous code).
export default async function globalSetup() {
  const context = await request.newContext();
  await signIn(context, CREW_EMAIL);
  mkdirSync(path.dirname(CREW_STATE), { recursive: true });
  await context.storageState({ path: CREW_STATE });
  await context.dispose();
}
