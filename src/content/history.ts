import type { Milestone } from "@/components/guides/timeline";

/** RC plane history, checked against primary sources on 2026-10-20. */
export const PLANE_HISTORY: Milestone[] = [
  {
    year: "1898",
    title: "Tesla steers a boat by radio",
    body: "At an electrical exhibition in the new Madison Square Garden, Nikola Tesla steered a model boat across a pool without wires. He was granted US patent 613,809 that November.",
    source: { label: "PBS: Tesla's robots", href: "https://www.pbs.org/tesla/ll/ll_robots.html" },
  },
  {
    year: "1937",
    title: "The Good twins fly Big Guff",
    body: "In Kalamazoo, Walt and Bill Good made the first test flights of Big Guff, a radio-controlled model they built themselves. Rain kept it from an official flight at that year's Nationals.",
    source: {
      label: "Model Aviation: history of RC flying",
      href: "https://library.modelaviation.com/article/history-rc-flying-1",
    },
  },
  {
    year: "1940",
    title: "Three Nationals in a row",
    body: "Big Guff won the RC event at the Nationals in 1938, 1939 and 1940. In 1938 it won on a ground demonstration after a crash, which tells you a lot about early radio.",
    source: {
      label: "Model Aviation: RC milestones",
      href: "https://library.modelaviation.com/article/milestones-rc",
    },
  },
  {
    year: "1941",
    title: "A hobby becomes the first mass-produced drone",
    body: "Actor and modeller Reginald Denny's Radioplane company turned his hobby into target drones for gunnery practice. Deliveries of the OQ-2 began in June 1941 and about 15,000 were built during the war.",
    source: {
      label: "March Field Air Museum: OQ-2",
      href: "https://www.marchfield.org/oq-2-rp-5-radioplane/",
    },
  },
  {
    year: "1945",
    title: "Discovered on the drone line",
    body: "An Army photographer at the Radioplane factory in Van Nuys took pictures of a young worker named Norma Jeane Dougherty, around 1944 to 1945. She became Marilyn Monroe.",
    source: {
      label: "Northrop Grumman: Marilyn Monroe",
      href: "https://www.northropgrumman.com/life-at-northrop-grumman/marilyn-monroe-in-northrop-grumman-history",
    },
  },
  {
    year: "1950",
    title: "The engine that fit in your palm",
    body: "Cox released the .049 Thimble Drome Space Bug glow engine in October 1950. Tiny glow engines put powered models within reach of almost anyone.",
    source: {
      label: "AMA history: Leroy Cox",
      href: "https://www.modelaircraft.org/sites/default/files/files/CoxLeroyM.pdf",
    },
  },
  {
    year: "1950s",
    title: "One channel, rudder only",
    body: "Through the 1950s most RC flying used a single channel: a rubber-band escapement flicked the rudder left or right. Multi-channel reed radios, with Orbit a leading maker, arrived late in the decade.",
    source: {
      label: "Model Aviation: radio control history",
      href: "https://www.modelaviation.com/article/radio-control-history",
    },
  },
  {
    year: "1962",
    title: "Proportional control",
    body: "Doug Spreng's Digicon flew in 1962: surfaces that moved exactly as far as the stick, not just full left or full right. By the 1965 Nationals three in four entrants used proportional radios.",
    source: {
      label: "AMA history: Doug Spreng",
      href: "https://www.modelaircraft.org/sites/default/files/files/SprengDouglasDougCarder.pdf",
    },
  },
  {
    year: "1967",
    title: "The Kwik Fli wins",
    body: "Phil Kraft won the Nationals with his Kwik Fli III and his own proportional radio. Kraft gear and low-wing pattern planes set the look of the sport for years.",
    source: {
      label: "Model Aviation: RC milestones",
      href: "https://library.modelaviation.com/article/milestones-rc",
    },
  },
  {
    year: "1984",
    title: "Radios with a memory",
    body: "Computer transmitters such as the Multiplex Royal MC stored settings for several models, along with mixes and trims. Setting up a plane moved from the workbench to a menu.",
    source: {
      label: "Model Aviation: radio technique",
      href: "https://library.modelaviation.com/article/radio-technique-124",
    },
  },
  {
    year: "2005",
    title: "2.4 GHz ends the frequency board",
    body: "Spektrum showed its 2.4 GHz DSM system in October 2004 and the DX6 air radio followed in late 2005. Transmitters now pick clear channels themselves, so pilots no longer had to share crystal channels.",
    source: {
      label: "Spektrum history",
      href: "https://www.spektrumrc.com/about-spektrum-spektrum-history/spm-bs-about-us.html",
    },
  },
  {
    year: "2000s",
    title: "Electric goes mainstream",
    body: "Lithium polymer packs and brushless outrunner motors became the norm in the mid-2000s, and foam bind-and-fly planes followed. No fuel and no tuning: charge, bind and fly.",
    source: {
      label: "Model Aviation: LiPo primer (2004)",
      href: "https://library.modelaviation.com/article/introduction-lithium-polymer-batteries-200405",
    },
  },
  {
    year: "2013",
    title: "A plane that rescues you",
    body: "Horizon Hobby's AS3X (2011) steadied small planes with on-board gyros. SAFE, announced in 2013, added beginner modes and a panic button that levels the plane for you.",
    source: { label: "FlyRC: SAFE announced", href: "https://flyrc.com/?p=6068" },
  },
  {
    year: "2024",
    title: "Remote ID becomes the rule",
    body: "Registered model aircraft had to broadcast Remote ID from September 16, 2023, and FAA enforcement began on March 16, 2024. Clubs with recognised fields (FRIAs) are the exception.",
    source: {
      label: "FAA: end of Remote ID discretion",
      href: "https://www.faa.gov/newsroom/faa-ends-discretionary-enforcement-policy-drone-remote-identification",
    },
  },
];
