/**
 * The guides hub. Only published guides get a link; the rest are listed as in the works.
 * `cover` picks the drawing on the guide's manual cover on the home page.
 */
export const GUIDES = [
  {
    href: "/guides/rc-planes",
    title: "The RC plane, taken apart",
    dek: "From Tesla's boat to 2.4 GHz, every part of a modern trainer, and an interactive bench that follows one command from your thumb to the elevator.",
    minutes: 12,
    cover: "plane",
  },
  {
    href: "/guides/rc-helicopters",
    title: "The RC helicopter, taken apart",
    dek: "Fifty years of learning to hover, every part of a modern 450, and benches you can drive: the swashplate, the tail and the hover.",
    minutes: 15,
    cover: "heli",
  },
  {
    href: "/guides/cars-and-crawlers",
    title: "Cars and crawlers, taken apart",
    dek: "Sixty years of radio cars, every part of a short-course truck, and benches for the differential, the shocks and the gearing.",
    minutes: 15,
    cover: "car",
  },
  {
    href: "/guides/flying-legally",
    title: "Flying legally in South Florida",
    dek: "TRUST, registration, Remote ID, Miami's airspace, Florida's drone laws and the county park rules, each with a link to the source.",
    minutes: 6,
    cover: "airspace",
  },
] as const;

export const IN_THE_WORKS = ["LiPo batteries without the scary stories"] as const;
