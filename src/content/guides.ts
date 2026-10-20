/** The guides hub. Only published guides get a link; the rest are listed as in the works. */
export const GUIDES = [
  {
    href: "/guides/rc-planes",
    title: "The RC plane, taken apart",
    dek: "From Tesla's boat to 2.4 GHz, every part of a modern trainer, and an interactive bench that follows one command from your thumb to the elevator.",
    minutes: 12,
  },
  {
    href: "/guides/flying-legally",
    title: "Flying legally in South Florida",
    dek: "TRUST, registration, Remote ID, Miami's airspace, Florida's drone laws and the county park rules, each with a link to the source.",
    minutes: 6,
  },
] as const;

export const IN_THE_WORKS = [
  "The RC helicopter, taken apart",
  "Cars and crawlers: suspension, diffs and gearing",
  "LiPo batteries without the scary stories",
] as const;
