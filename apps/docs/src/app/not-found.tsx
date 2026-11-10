import Link from "next/link";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export default function NotFound() {
  return (
    <DocsPage>
      <DocsTitle>Page not found</DocsTitle>
      <DocsBody>
        <p>
          This page doesn&apos;t exist, or it moved. Search with the box at the top, or go back to
          the <Link href="/">start</Link>.
        </p>
      </DocsBody>
    </DocsPage>
  );
}
