import { expect, type Page, test } from "@playwright/test";
import { crewApi, unique } from "./data.ts";
import { CREW_INBOX } from "./env.ts";
import { crewMessages, inboxItem, mailsWith, openCrewConsole, waitForMailWith } from "./forms.ts";
import { newEmail } from "./people.ts";

// docs/bits/community.share-build.md: a visitor shares a build from /community ("Show us your
// build"). It reaches the crew's inbox at /crew and CREW_INBOX as a build; it needs the person's OK
// to publish it, and a link to photos must be a web link.
test.describe("community.share-build", () => {
  async function fillBuild(
    page: Page,
    build: { name: string; email: string; model: string; story: string; link: string },
  ) {
    await page.goto("/community");
    const form = page.getByRole("region", { name: "Show us your build", exact: true });
    await expect(form.getByRole("button", { name: "Send your build" })).toBeVisible();
    await form.getByLabel("Your name").fill(build.name);
    await form.getByLabel("Email (never published)").fill(build.email);
    await form.getByLabel("What did you build or fly?").fill(build.model);
    await form.getByLabel("The story").fill(build.story);
    await form.getByLabel("Link to photos or video (optional)").fill(build.link);
  }

  test("a visitor shares a build and the crew gets it on /crew and by email", async ({
    page,
    browser,
  }) => {
    const build = {
      name: unique("Bo Builder"),
      email: newEmail("build"),
      model: "Scratch-built foam Cub",
      story: unique(
        "Two winters of work, a new wing after the first landing, flies at Markham Park.",
      ),
      link: "https://example.com/photos/foam-cub",
    };
    await fillBuild(page, build);
    await page
      .getByRole("checkbox", { name: /It's my own work and SunTzu RC can publish it/ })
      .check();
    await page.getByRole("button", { name: "Send your build" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Thanks! We'll read it and get in touch before anything goes live.",
    );

    const mail = await waitForMailWith(CREW_INBOX, build.story);
    expect(mail.subject).toBe(`New build on SunTzu RC: ${build.model}`);
    expect(mail.text).toContain("Someone shared a build");
    expect(mail.text).toContain(`From ${build.name} <${build.email}>`);
    expect(mail.text).toContain(build.link);

    const crew = await openCrewConsole(browser);
    const item = inboxItem(crew, build.story);
    await expect(item).toContainText(`Build · ${build.name} <${build.email}>`);
    // The model heads the story.
    await expect(item).toContainText(`${build.model}\n\n${build.story}`.replace(/\s+/g, " "));
    await expect(item.getByRole("link", { name: build.link })).toHaveAttribute("href", build.link);
    await crew.context().close();
  });

  test("without the OK to publish, or with a link that isn't a web link, nothing is sent", async ({
    page,
    playwright,
  }) => {
    const build = {
      name: "Bo Builder",
      email: newEmail("build"),
      model: "1/10 crawler",
      story: unique("A crawler build that must not reach the crew without consent."),
      link: "javascript:alert(1)",
    };
    await fillBuild(page, build);
    await page.getByRole("button", { name: "Send your build" }).click();

    await expect(page.getByRole("status")).toHaveText("Please fix the highlighted fields.");
    await expect(page.getByLabel("Link to photos or video (optional)")).toHaveAccessibleDescription(
      /Paste a full link, starting with https:\/\//,
    );
    await expect(
      page.getByRole("checkbox", { name: /It's my own work/ }),
    ).toHaveAccessibleDescription(/We need your OK to publish it\./);

    // A good link, still without the OK.
    await page.getByLabel("Link to photos or video (optional)").fill("https://example.com/crawler");
    await page.getByRole("button", { name: "Send your build" }).click();
    await expect(
      page.getByRole("checkbox", { name: /It's my own work/ }),
    ).toHaveAccessibleDescription(/We need your OK to publish it\./);

    const crew = await crewApi(playwright);
    expect((await crewMessages(crew)).some((item) => item.body.includes(build.story))).toBe(false);
    await crew.dispose();
    expect(mailsWith(CREW_INBOX, build.story)).toHaveLength(0);
  });
});
