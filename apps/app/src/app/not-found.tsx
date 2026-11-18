import { NotFoundMessage } from "@/components/not-found-message";
import { SiteFrame } from "@/components/site-frame";

// An address that matches no page. It renders inside the root layout only, so it brings the site's
// frame itself. `notFound()` from a page uses (site)/not-found.tsx or (app)/not-found.tsx instead,
// which render inside their group's layout (and its frame).
export default function NotFound() {
  return (
    <SiteFrame>
      <NotFoundMessage />
    </SiteFrame>
  );
}
