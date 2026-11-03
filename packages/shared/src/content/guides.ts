/**
 * The guides hub. Only published guides get a link; the rest are listed as in the works.
 * `cover` picks the drawing on the guide's manual cover on the home page; `sections` are the
 * headings on its page (their anchors), which search uses to find the guide.
 */
export const GUIDES = [
  {
    href: "/guides/rc-planes",
    title: "The RC plane, taken apart",
    dek: "From Tesla's boat to 2.4 GHz, every part of a modern trainer, and an interactive bench that follows one command from your thumb to the elevator.",
    minutes: 12,
    cover: "plane",
    sections: [
      { id: "history", title: "Where it started" },
      { id: "chain", title: "From thumb to elevator" },
      { id: "parts", title: "Every part, and what it does" },
      { id: "balance", title: "Finding the balance point" },
      { id: "power", title: "Power, on the bench" },
      { id: "then-now", title: "Then and now" },
    ],
  },
  {
    href: "/guides/rc-helicopters",
    title: "The RC helicopter, taken apart",
    dek: "Fifty years of learning to hover, every part of a modern 450, and benches you can drive: the swashplate, the tail and the hover.",
    minutes: 15,
    cover: "heli",
    sections: [
      { id: "history", title: "Where it started" },
      { id: "swashplate", title: "From stick to swashplate" },
      { id: "parts", title: "Every part, and what it does" },
      { id: "tail", title: "Why it needs a tail" },
      { id: "hover", title: "Finding the hover" },
      { id: "then-now", title: "Then and now" },
    ],
  },
  {
    href: "/guides/cars-and-crawlers",
    title: "Cars and crawlers, taken apart",
    dek: "Sixty years of radio cars, every part of a short-course truck, and benches for the differential, the shocks and the gearing.",
    minutes: 15,
    cover: "car",
    sections: [
      { id: "history", title: "Where it started" },
      { id: "diff", title: "Why the wheels turn at different speeds" },
      { id: "parts", title: "Every part, and what it does" },
      { id: "shocks", title: "Springs hold it up, oil calms it down" },
      { id: "gearing", title: "Gearing for speed" },
      { id: "crawlers", title: "Crawlers: the slow end" },
      { id: "then-now", title: "Then and now" },
    ],
  },
  {
    href: "/guides/flying-legally",
    title: "Flying legally in South Florida",
    dek: "TRUST, registration, Remote ID, Miami's airspace, Florida's drone laws and the county park rules, each with a link to the source.",
    minutes: 6,
    cover: "airspace",
    sections: [
      { id: "faa", title: "The FAA basics" },
      { id: "florida", title: "Florida law" },
      { id: "parks", title: "County parks" },
      { id: "ama", title: "Why most of us join the AMA" },
    ],
  },
] as const;

export const IN_THE_WORKS = ["LiPo batteries without the scary stories"] as const;
