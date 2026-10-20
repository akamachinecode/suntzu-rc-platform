/** App-wide settings. Edit here instead of hard-coding them in pages. */
export const SITE = {
  name: "Rc Landing",
  description: "Rc Landing — replace this with a one-sentence description of the app.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com",
  lang: "en",
  nav: [
    { label: "Home", href: "/" },
    { label: "Contact", href: "/contact" },
  ],
} as const;
