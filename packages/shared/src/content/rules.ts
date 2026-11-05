/**
 * Flying RC aircraft legally in South Florida, as of October 2026. Summaries, not legal advice:
 * every item links to the rule itself.
 */

export interface Rule {
  /** Stable: search pins answers to it, so it survives a change of title. */
  id: string;
  title: string;
  body: string;
  source: { label: string; href: string };
}

export const FAA_RULES: Rule[] = [
  {
    id: "trust",
    title: "Pass TRUST before you fly",
    body: "The Recreational UAS Safety Test is free, online and run by FAA-approved administrators, including the AMA. Carry proof when you fly; lose it and you take the test again.",
    source: {
      label: "FAA: recreational flyers",
      href: "https://www.faa.gov/uas/recreational_flyers",
    },
  },
  {
    id: "register",
    title: "Register anything 250 g or heavier",
    body: "Recreational registration costs $5, covers every model you own and lasts three years. Mark the number on the outside of each model and carry the certificate.",
    source: {
      label: "FAA: register",
      href: "https://www.faa.gov/uas/getting_started/register_drone",
    },
  },
  {
    id: "remote-id",
    title: "Broadcast Remote ID, or fly at a FRIA",
    body: "A registered model must broadcast Remote ID, built in or with a module. The exception is a FAA-Recognized Identification Area, where you and the model stay inside the area and in sight. Several local club fields are FRIAs, which makes joining a club the simplest way to fly without a module.",
    source: {
      label: "FAA: Remote ID and FRIAs",
      href: "https://www.faa.gov/uas/getting_started/remote_id/fria",
    },
  },
  {
    id: "altitude",
    title: "Stay under 400 ft, and ask in controlled airspace",
    body: "In uncontrolled (Class G) airspace the ceiling is 400 ft. Around Miami International and Fort Lauderdale you need authorization through a LAANC app first. Registered AMA club sites in Class G can now fly higher in daytime.",
    source: {
      label: "FAA: airspace authorization",
      href: "https://www.faa.gov/uas/recreational_flyers/authorization",
    },
  },
];

export const FLORIDA_RULES: Rule[] = [
  {
    id: "infrastructure",
    title: "Stay away from critical infrastructure",
    body: "Flying over or interfering with power plants, water plants, ports, airports, prisons, military sites, cell towers and dams is a third-degree felony in Florida. Flying over a K-12 school is a misdemeanor.",
    source: {
      label: "Florida Statutes 330.41",
      href: "https://www.flsenate.gov/Laws/Statutes/2026/330.41",
    },
  },
  {
    id: "privacy",
    title: "Don't film people's property",
    body: "Recording private property or the people on it with intent to surveil, without written consent, lets the owner sue. Point the camera at the sky, not the neighbours.",
    source: {
      label: "Florida Statutes 934.50",
      href: "https://www.flsenate.gov/Laws/Statutes/2026/934.50",
    },
  },
  {
    id: "farms",
    title: "Farm fields need the owner's OK",
    body: "Flying over land classified as agricultural without the owner's consent is a misdemeanor. That matters for fields on farmland, so fly where the club has permission.",
    source: {
      label: "Florida Statutes 330.41",
      href: "https://www.flsenate.gov/Laws/Statutes/2026/330.41",
    },
  },
];

export const PARK_RULES: Rule[] = [
  {
    id: "miami-dade-parks",
    title: "Miami-Dade parks need written permission",
    body: "County park rules ban taking off or landing any aerial apparatus without the Parks Director's written permission. Natural areas and the Deering Estate are off-limits.",
    source: {
      label: "Miami-Dade Parks rules",
      href: "https://www.miamidade.gov/global/recreation/rules-regulations.page",
    },
  },
  {
    id: "broward-parks",
    title: "Broward: fly at Markham Park",
    body: "Broward's model airplane field at Markham Park needs AMA membership, a park flying badge and club membership.",
    source: { label: "Markham Park Pilots Association", href: "https://mppapilots.com" },
  },
  {
    id: "palm-beach-parks",
    title: "Palm Beach allows most parks",
    body: "Recreational flying is allowed in most Palm Beach County parks, except the nature centers, Riverbend, Loxahatchee River Battlefield, Morikami and Juno Beach Pier.",
    source: {
      label: "Palm Beach County Parks FAQ",
      href: "https://discover.pbc.gov/parks/General/FAQs.aspx",
    },
  },
];

export const AMA = {
  body: "Full AMA membership is $89 a year for adults ($79 over 65, $20 under 19). It includes $2.5 million in liability cover and, with a club, access to chartered fields. The $52 Park Pilot tier covers models up to 2 lb and 60 mph with no combustion engine.",
  source: {
    label: "AMA membership options",
    href: "https://www.modelaircraft.org/membership/membership-options",
  },
};
