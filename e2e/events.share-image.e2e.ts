import { type APIRequestContext, expect, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { AN_EVENT, editEvent, pngSize, word } from "./public.ts";

// docs/bits/events.share-image.md: a shared event page shows a 1200×630 pit pass drawn for the
// event (name, dates, place, kind, discipline; cancelled ones say so); an unknown event gets a
// generic pass.
test.describe("events.share-image", () => {
  // Link previews are made by the network's bot, which reads the page's <head> (browsers get the
  // same tags later in the page, streamed).
  const PREVIEW_BOT = {
    "user-agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  };

  /** The preview image a social network or chat app finds on the event's page, fetched as it does. */
  async function shareImage(request: APIRequestContext, slug: string) {
    const page = await request.get(`/events/${slug}`, { headers: PREVIEW_BOT });
    expect(page.status()).toBe(200);
    const head = (await page.text()).split("</head>")[0]!;
    const meta = (key: string) =>
      head.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];
    expect(meta("og:image:alt")).toBe("Event pass from SunTzu RC");
    expect(meta("og:image:width")).toBe("1200");
    expect(meta("og:image:height")).toBe("630");
    const image = meta("og:image");
    expect(image, `no og:image in the <head> of /events/${slug}`).toBeTruthy();
    expect(meta("twitter:image")).toBe(image);
    const url = new URL(image!.replace(/&amp;/g, "&"));
    expect(url.pathname).toMatch(new RegExp(`^/events/${slug}/opengraph-image`));

    const response = await request.get(`${url.pathname}${url.search}`, { headers: PREVIEW_BOT });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const png = await response.body();
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
    return { png, path: url.pathname };
  }

  test("an event's page offers its pass, a 1200×630 PNG drawn for that event", async ({
    request,
    playwright,
  }) => {
    const find = word();
    const one = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Jet Jam`,
      startDate: inDays(30),
    });
    const other = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Glider Day`,
      startDate: inDays(30),
    });

    const first = await shareImage(request, one.slug);
    // Drawn the same way every time, and differently for another event.
    const again = await request.get(first.path);
    expect((await again.body()).equals(first.png)).toBe(true);
    const second = await shareImage(request, other.slug);
    expect(second.png.equals(first.png)).toBe(false);
  });

  test("a cancelled event's pass says so", async ({ request, playwright }) => {
    // Two editions alike in everything but one is cancelled.
    const event = {
      ...AN_EVENT,
      name: `${word()} Swap Meet`,
      startDate: inDays(45),
      placeText: "Tampa, FL",
    };
    const on = await addEvent(playwright, event);
    const off = await addEvent(playwright, event);
    await editEvent(playwright, off.slug, { status: "cancelled" });

    const running = await shareImage(request, on.slug);
    const cancelled = await shareImage(request, off.slug);
    expect(cancelled.png.equals(running.png)).toBe(false);
  });

  test("an unknown event gets the generic SunTzu RC pass", async ({ request, playwright }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Heli Fest`,
      startDate: inDays(30),
    });
    const known = await shareImage(request, event.slug);

    const response = await request.get(
      known.path.replace(event.slug, word("no-such-event-").toLowerCase()),
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const generic = await response.body();
    expect(pngSize(generic)).toEqual({ width: 1200, height: 630 });
    expect(generic.equals(known.png)).toBe(false);
  });
});
