import { expect, type Page, test } from "@playwright/test";
import { becomeOrganiser, crewApi, unique, ZIP_CODES } from "./data.ts";
import { API, CREW_INBOX } from "./env.ts";
import { mailsWith, waitForMailWith, type PlaywrightApi } from "./forms.ts";
import { crewPage, FROM_APP, newEmail, signIn } from "./people.ts";

// docs/bits/try.request.md: a newcomer asks to try RC on /try. Up to three clubs within 60 miles
// that welcome newcomers, have a verified organiser and fly that discipline get it by email;
// otherwise the crew does (CREW_INBOX and /crew/claims). Only with the person's consent.
// (apps/app/e2e/forms.spec.ts checks how the form answers errors.)

// ZIP codes loaded by database.ts: Fleming Island is hundreds of miles from every seeded field;
// Coconut Grove, in Miami, is 28 miles from Markham Park and only Silver Field (amps) is closer.
const FAR = ZIP_CODES.flemingIsland;
const NEAR_MARKHAM = ZIP_CODES.miami;
const CLUB = "markham-park-pilots";

type Request = { id: string; name: string; email: string; zip: string; discipline: string };

test.describe("try.request", () => {
  async function askToTry(
    page: Page,
    person: { name: string; email: string; zip: string; discipline: string; message: string },
    consent = true,
  ) {
    await page.goto("/try");
    await page.getByLabel("Your name").fill(person.name);
    await page.getByLabel("Email", { exact: true }).fill(person.email);
    await page.getByLabel("ZIP code").fill(person.zip);
    await page.getByRole("radio", { name: person.discipline }).check();
    await page.getByLabel("Anything they should know?").fill(person.message);
    if (consent)
      await page
        .getByRole("checkbox", { name: /I agree that SunTzu RC passes my name and email/ })
        .check();
    await page.getByRole("button", { name: "Find me a club" }).click();
  }

  async function openForCrew(playwright: PlaywrightApi): Promise<Request[]> {
    const crew = await crewApi(playwright);
    const response = await crew.get(`${API}/crew/try`);
    expect(response.status()).toBe(200);
    const list = (await response.json()) as Request[];
    await crew.dispose();
    return list;
  }

  test("far from every club that takes newcomers, the crew gets it and marks it as sent", async ({
    page,
    browser,
  }) => {
    const person = {
      name: unique("Nia Newcomer"),
      email: newEmail("newcomer"),
      zip: FAR.zip,
      discipline: "Helicopters",
      message: unique("I've flown a simulator and I'd like a first lesson."),
    };
    await askToTry(page, person);
    await expect(page.getByRole("heading", { name: "Sent." })).toBeFocused();
    await expect(
      page.getByText(
        /No club near you has signed up for newcomers on SunTzu RC yet, so the crew got it/,
      ),
    ).toBeVisible();

    const mail = await waitForMailWith(CREW_INBOX, person.email);
    expect(mail.subject).toBe(`A newcomer wants to try RC helicopters near ${FAR.zip}`);
    expect(mail.text).toContain(`${person.name} <${person.email}>, ZIP ${FAR.zip}.`);
    expect(mail.text).toContain(person.message);

    const crew = await crewPage(browser);
    await crew.goto("/crew/claims");
    const waiting = crew
      .getByRole("region", { name: "Newcomers waiting for a club" })
      .getByRole("listitem")
      .filter({ hasText: person.email });
    await expect(waiting).toContainText(
      `${person.name} · ${person.email} · ZIP ${FAR.zip} · Helicopters`,
    );
    await expect(waiting).toContainText(person.message);
    await waiting
      .getByRole("button", { name: new RegExp(`^Mark as sent\\W+${person.name}$`) })
      .click();
    await expect(waiting).toHaveCount(0);
    await crew.reload();
    await expect(crew.getByText(person.email)).toHaveCount(0);
    await crew.context().close();
  });

  test("near a club that welcomes newcomers, its organiser gets it, for what the club flies", async ({
    page,
    playwright,
  }) => {
    // A member runs Markham Park Pilots and says the club takes newcomers and flies planes.
    const organiser = await playwright.request.newContext();
    const organiserEmail = await signIn(organiser, newEmail("organiser"));
    await becomeOrganiser(playwright, organiser, organiserEmail, CLUB);
    const dashboard = await organiser.get(`${API}/organise/${CLUB}`);
    expect(dashboard.status()).toBe(200);
    const { host } = (await dashboard.json()) as {
      host: { name: string; acceptsNewcomers: boolean; disciplines: string[] };
    };
    const update = (data: object) =>
      organiser.patch(`${API}/organise/${CLUB}`, { data, headers: FROM_APP });
    expect((await update({ acceptsNewcomers: true, disciplines: ["air"] })).status()).toBe(204);

    try {
      const person = {
        name: unique("Leo Newcomer"),
        email: newEmail("newcomer"),
        zip: NEAR_MARKHAM.zip,
        discipline: "Planes and jets",
        message: unique("My son is 12 and we'd like to start with a trainer."),
      };
      await askToTry(page, person);
      await expect(page.getByRole("heading", { name: "Sent." })).toBeVisible();
      await expect(
        page.getByText(/^It went to .*\. Their organisers will write to you by email\.$/),
      ).toContainText(host.name);

      const mail = await waitForMailWith(organiserEmail, person.email);
      expect(mail.subject).toBe("Someone near you wants to try RC planes");
      expect(mail.text).toContain(`${person.name} would like to try RC planes`);
      expect(mail.text).toMatch(
        new RegExp(
          `about \\d+ miles from your field \\(ZIP ${NEAR_MARKHAM.zip}\\) and found ${host.name}`,
        ),
      );
      expect(mail.text).toContain(person.message);
      expect(mail.text).toContain(`Reply to them at ${person.email}.`);
      // The crew isn't needed: no email, nothing waiting at /crew/claims.
      expect(mailsWith(CREW_INBOX, person.email)).toHaveLength(0);
      expect(
        (await openForCrew(playwright)).some((request) => request.email === person.email),
      ).toBe(false);

      // Cars: the club only flies planes, so it doesn't get this one.
      const driver = {
        ...person,
        name: unique("Cal Driver"),
        email: newEmail("newcomer"),
        discipline: "Cars",
      };
      await askToTry(page, driver);
      await expect(page.getByRole("heading", { name: "Sent." })).toBeVisible();
      await expect(page.getByText(host.name)).toHaveCount(0);
      expect(mailsWith(organiserEmail, driver.email)).toHaveLength(0);
    } finally {
      await update({ acceptsNewcomers: host.acceptsNewcomers, disciplines: host.disciplines });
      await organiser.dispose();
    }
  });

  test("a ZIP code outside Florida asks whether it's in Florida, and nothing is sent", async ({
    page,
    playwright,
  }) => {
    const person = {
      name: unique("Out Of State"),
      email: newEmail("newcomer"),
      zip: "90210",
      discipline: "FPV drones",
      message: "Visiting from California.",
    };
    await askToTry(page, person);
    await expect(page.getByRole("status")).toHaveText(
      "We don't know that ZIP code. Is it in Florida?",
    );
    await expect(page.getByLabel("ZIP code")).toHaveValue("90210");
    await expect(page.getByLabel("Your name")).toHaveValue(person.name);
    expect((await openForCrew(playwright)).some((request) => request.email === person.email)).toBe(
      false,
    );
    expect(mailsWith(CREW_INBOX, person.email)).toHaveLength(0);
  });

  test("without the newcomer's OK nothing is sent: the form asks, the API refuses", async ({
    page,
    request,
    playwright,
  }) => {
    const person = {
      name: unique("No Consent"),
      email: newEmail("newcomer"),
      zip: FAR.zip,
      discipline: "Planes and jets",
      message: "Just looking.",
    };
    await askToTry(page, person, false);
    await expect(
      page.getByRole("checkbox", { name: /I agree that SunTzu RC passes my name and email/ }),
    ).toHaveAccessibleDescription(/We need your OK to pass your name and email to the club\./);

    const valid = {
      name: person.name,
      email: person.email,
      zip: FAR.zip,
      discipline: "air",
      consent: true,
    };
    for (const [what, change] of [
      ["no consent", { consent: undefined }],
      ["consent refused", { consent: false }],
      ["a ZIP code that isn't 5 digits", { zip: "3200" }],
      ["an unknown discipline", { discipline: "boats" }],
      ["an email that isn't one", { email: "newcomer-at-example.test" }],
    ] as const) {
      const response = await request.post(`${API}/try`, {
        data: { ...valid, ...change },
        headers: FROM_APP,
      });
      expect(response.status(), what).toBe(400);
    }
    expect((await openForCrew(playwright)).some((item) => item.email === person.email)).toBe(false);
    expect(mailsWith(CREW_INBOX, person.email)).toHaveLength(0);
  });
});
