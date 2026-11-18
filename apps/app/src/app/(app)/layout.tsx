import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";

// Private area: pages for signed-in members (My SunTzu RC, the crew console, an organiser's club,
// the notes example). List every section in src/proxy.ts `matcher`; the API checks every request.
// Same frame as the public pages (members move between both), but never indexed.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
