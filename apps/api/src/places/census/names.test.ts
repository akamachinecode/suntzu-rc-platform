import { describe, expect, it } from "vitest";
import {
  cityName,
  editDistance,
  mergeAliases,
  nameKey,
  slugify,
  tidyName,
  uniqueSlug,
  withoutCompanySuffix,
} from "./names.js";

describe("tidyName", () => {
  it("title-cases names the register writes in capitals, keeping acronyms", () => {
    expect(tidyName("TOHOPEKALIGA HIGH SCHOOL")).toBe("Tohopekaliga High School");
    expect(tidyName("JACKSONVILLE NAS CLASS D")).toBe("Jacksonville NAS Class D");
    expect(tidyName("MIAMI DADE-COLLIER TRAINING AND TRANSITION AIRPORT CLASS E2")).toBe(
      "Miami Dade-Collier Training and Transition Airport Class E2",
    );
    expect(tidyName("TITUSVILLE, NASA SHUTTLE LANDING FACILITY")).toBe(
      "Titusville, NASA Shuttle Landing Facility",
    );
    expect(tidyName("SE 110TH ST")).toBe("SE 110th St");
    expect(tidyName("CR 17A")).toBe("CR 17A");
  });

  it("leaves names written with care alone, fixing only the usual slips", () => {
    expect(tidyName("RCINFORMER Field")).toBe("RCINFORMER Field");
    expect(tidyName("Airmasters Rc Club")).toBe("Airmasters RC Club");
    expect(tidyName("Quiet Birds Of Vero Beach")).toBe("Quiet Birds of Vero Beach");
    expect(tidyName("Orlando_FL")).toBe("Orlando FL");
  });
});

describe("cityName", () => {
  it("title-cases cities, keeps inner capitals and fixes known typos", () => {
    expect(cityName("SAINT PETERSBURG")).toBe("Saint Petersburg");
    expect(cityName("brooksville")).toBe("Brooksville");
    expect(cityName("DeFuniak Springs")).toBe("DeFuniak Springs");
    expect(cityName("Land O'Lakes")).toBe("Land O'Lakes");
    expect(cityName("Mararsyktown")).toBe("Masaryktown");
    expect(cityName("  ")).toBeUndefined();
  });
});

describe("slugs", () => {
  it("makes lowercase hyphenated slugs", () => {
    expect(slugify("Villages 'E' Flyers field (Powell Rd)")).toBe(
      "villages-e-flyers-field-powell-rd",
    );
    expect(slugify("Emergency Management & Homeland Security")).toBe(
      "emergency-management-and-homeland-security",
    );
  });

  it("adds the city, then a number, when a slug is taken", () => {
    const taken = new Set(["imperial-rc-club-field"]);
    expect(uniqueSlug("imperial-rc-club-field", taken, "Ft Meade")).toBe(
      "imperial-rc-club-field-ft-meade",
    );
    taken.add("imperial-rc-club-field-ft-meade");
    expect(uniqueSlug("imperial-rc-club-field", taken, "Ft Meade")).toBe(
      "imperial-rc-club-field-ft-meade-2",
    );
    expect(uniqueSlug("silver-field", taken)).toBe("silver-field");
  });
});

describe("nameKey", () => {
  it("matches the same club however a register spells it", () => {
    const same = [
      ["Imperial RC Club Inc", "Imperial Radio Control Club, Inc."],
      ["Palm Beach R/C Association", "Palm Beach Radio Control Association"],
      ["Aero Modelers of Perrine Inc", "Aero Modelers of Perrine"],
      ["Deland RC Club", "DeLand RC"],
      ["W Pasco Model Pilots Association Inc", "West Pasco Model Pilots Association"],
      ["Saint Augustine RC Flyers", "St. Augustine R/C Flyers"],
      ['Villages "E" Flyers', "Villages 'E' Flyers"],
      ["Sanford Aero Modelers DBA Sams", "Sanford Aero Modelers DBA Sam's"],
      ["R/C Fliers of Venice Inc", "RC Flyers Of Venice"],
    ];
    for (const [a, b] of same) expect(nameKey(a!), `${a} = ${b}`).toBe(nameKey(b!));
    expect(nameKey("Collier Fun Flyers")).not.toBe(nameKey("Collier Model Aeronautic Club"));
  });

  it("measures typos between keys", () => {
    expect(
      editDistance(
        nameKey("Ridge Barnstomers of Lake Wales"),
        nameKey("Ridge Barnstormers of Lake Wales"),
      ),
    ).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});

describe("mergeAliases", () => {
  it("adds only names that match differently", () => {
    expect(mergeAliases("Imperial Radio Control Club", [], ["Imperial RC Club", "IRCC"])).toEqual([
      "IRCC",
    ]);
    expect(
      mergeAliases("Lake Aircraft Radio Kontrol Squad", ["LARKS"], ["LARKS", "Larks "]),
    ).toEqual(["LARKS"]);
  });
});

it("drops company suffixes", () => {
  expect(withoutCompanySuffix("Avon Park Aeromodelers, Inc.")).toBe("Avon Park Aeromodelers");
  expect(withoutCompanySuffix("SPARKS, Inc")).toBe("SPARKS");
  expect(withoutCompanySuffix("Mill Creek Aerodrome Inc")).toBe("Mill Creek Aerodrome");
});
