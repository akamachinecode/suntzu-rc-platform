import { SiteFrame } from "@/components/site-frame";

// Public pages: anyone can see them and search engines index them (list them in src/app/sitemap.ts).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
