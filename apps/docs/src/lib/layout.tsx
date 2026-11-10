import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Wordmark } from "@/components/wordmark";
import { SITE } from "@/lib/site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <Wordmark /> },
    githubUrl: SITE.repository,
    links: [{ text: "suntzurc.com", url: SITE.website, external: true }],
    // The brand is light only, like the site.
    themeSwitch: { enabled: false },
  };
}
