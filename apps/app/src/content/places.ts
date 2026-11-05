/** Clubs, fields and tracks. Sources: AMA club pages and each venue's site, checked 2026-10-20. */

export interface Place {
  name: string;
  kind: "Flying field" | "Car track";
  where: string;
  county: "Miami-Dade" | "Broward" | "Palm Beach";
  notes: string;
  url: string;
}

export const PLACES: Place[] = [
  {
    name: "Aero Modelers of Perrine (AMPS)",
    kind: "Flying field",
    where: "Silver Field, west of Krome Ave, Miami",
    county: "Miami-Dade",
    notes: "AMA club 200. Home of Jets Over Miami every December.",
    url: "https://www.amps-rc.com",
  },
  {
    name: "Markham Park Pilots Association",
    kind: "Flying field",
    where: "Markham Park, Sunrise",
    county: "Broward",
    notes:
      "AMA club 3229 and a FRIA. You'll need AMA membership, a park flying badge and club membership.",
    url: "https://mppapilots.com",
  },
  {
    name: "Palm Beach Radio Control Association",
    kind: "Flying field",
    where: "West Delray Regional Park, Delray Beach",
    county: "Palm Beach",
    notes: "AMA club 1016. Hosts 3D Over the Glades each February.",
    url: "https://www.palmbeachrc.com",
  },
  {
    name: "RC Bush Pilots",
    kind: "Flying field",
    where: "Dyer Park, West Palm Beach",
    county: "Palm Beach",
    notes: "AMA club 1829 and a FRIA, with a 700 ft altitude authorization.",
    url: "https://rcbushpilots.com",
  },
  {
    name: "Coral Springs RC Track",
    kind: "Car track",
    where: "Behind Petrillo Park, Coral Springs",
    county: "Broward",
    notes: "ROAR-sanctioned off-road and on-road racing.",
    url: "https://www.coralspringsrctrack.com/track-location/",
  },
  {
    name: "West Delray Regional Park",
    kind: "Car track",
    where: "Delray Beach",
    county: "Palm Beach",
    notes: "County park with an RC car track alongside the flying field.",
    url: "https://discover.pbc.gov/parks/Amenities/Radio-Controlled.aspx",
  },
];
