/** App-wide settings. Edit here instead of hard-coding them in pages. */
export const SITE = {
  name: "SunTzu RC",
  description:
    "Three RC obsessives in South Florida. Lessons, first-model help, advanced courses, local events and guides that take RC planes, helicopters and cars apart.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.suntzurc.com",
  lang: "en",
  region: "South Florida",
  nav: [
    { label: "Learn with us", href: "/learn" },
    { label: "Events", href: "/events" },
    { label: "Places", href: "/places" },
    { label: "Community", href: "/community" },
    { label: "Guides", href: "/guides" },
  ],
  cta: { label: "Book a lesson", href: "/contact?topic=lessons" },
} as const;
