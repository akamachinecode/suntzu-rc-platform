import type { PlaceAccess, PlaceKind } from "@workspace/shared";

// How places read on the site: the list, the map and each place's page.

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  "flying-field": "Flying field",
  "car-track": "Car track",
  indoor: "Indoor",
  venue: "Venue",
};

export const ACCESS_LABELS: Record<PlaceAccess, { label: string; detail: string }> = {
  public: {
    label: "Open to everyone",
    detail: "A public field or track: check the rules posted there.",
  },
  guests: {
    label: "Guests welcome",
    detail:
      "Visitors can fly or drive as guests, usually with a member and proof of AMA membership.",
  },
  members: {
    label: "Members only",
    detail: "Only club members use it. Ask the club about joining or a guest day.",
  },
  permission: {
    label: "Ask first",
    detail:
      "Most of these are club or private fields. Contact the club before you go, and never fly without their OK.",
  },
  unknown: {
    label: "Ask first",
    detail: "We don't know the rules yet. Contact whoever runs it before you go.",
  },
};

export const REGISTER_LABELS = {
  "faa-fria": "FAA-recognised identification area (FRIA)",
  "faa-fixed-site": "FAA recreational fixed site",
  crew: "Checked by the Servo crew",
  organiser: "Kept by its organiser",
} as const;
