# Discovery — finding every RC event in Florida

Status: **proposal, 2026-10-22.** This is the first stage of the events engine ([`EVENTS-ENGINE.md`](./EVENTS-ENGINE.md)) designed from first principles: how we find every published RC event in Florida, and how we _know_ we found them. Reading, resolving and publishing come after it and are not covered here.

## The question, made precise

"Have we found every event?" can't be answered by any single tool, because no tool sees the whole web and no list of RC events exists to check against. So we break it down until each piece can be built and measured.

1. **An event is discoverable once it is published somewhere.** Either it's on the public web (a club site, a calendar, a listing, a flyer PDF, a public Facebook event), or it only lives where machines can't go (private Facebook groups, Discord, email lists, a flyer pinned in a hobby shop). The first kind is a search problem. The second kind can only be reached through people. We measure both, and never pretend the second is solved by searching harder.
2. **Every event has an organiser, and organisers are finite.** Florida has a countable number of AMA clubs, car tracks, FPV chapters, hobby shops, promoters and sanctioning bodies: hundreds, not millions. Each publishes through a handful of channels. Find every organiser and watch every channel, and you have most events, early, with high precision.
3. **The rest is the long tail:** one-off events, new organisers, events listed only on someone else's page. Only open-web search finds those. Every one it finds is also a new organiser for point 2.
4. **Completeness can be estimated, not just hoped for.** If two independent methods each find events, the overlap between them tells us roughly how many neither found (capture–recapture, explained below). That is how we turn "muy bien hecho" into a number.

## What there is to find in Florida (researched 2026-10-22)

**Two different targets.** Florida has roughly 2,500–4,500 dated RC occurrences a year, but only about **400–700 are headline events** (fly-ins, contests, swap meets, series rounds, FPV races, regattas) that deserve their own page. The rest are **recurring days**: club race days at ~45 car tracks ("2nd and 4th Saturdays"), weekly sailing at 36 model-yacht clubs, practice days. Discovering each recurring date is the wrong job: we store a **schedule per venue** (a series with a rule) and confirm it against results sites. "Find every event" means every headline event plus every venue's schedule.

**The organisers, counted:**

| Organisers                                                      | In Florida                                                                                                 | Best list                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AMA clubs (air, some car and FPV)                               | ~110                                                                                                       | FAA FRIA layer (163 FL sites, 82 AMA charters) and Recreational Flyer Fixed Sites (104 FL): public US government data. The AMA Club Finder adds websites, but its terms forbid redistributing the list and pages carry personal contacts: use it only to find websites. |
| Car tracks                                                      | ~40–50                                                                                                     | ROAR track locator (7), LiveRC subdomains (17+), RCSignup venues (13+), shops with tracks                                                                                                                                                                               |
| FPV chapters and groups                                         | ~7 MultiGP chapters + FRIA groups                                                                          | MultiGP (its chapter list is disallowed by robots.txt: partnership; MultiGP is based in Florida)                                                                                                                                                                        |
| Model yacht clubs                                               | 36 (AMYA Region 7)                                                                                         | AMYA club and regatta finders (allowed by robots.txt)                                                                                                                                                                                                                   |
| Specialists (pattern, IMAC, scale, soaring, heli, floats, jets) | Inside the AMA clubs                                                                                       | Their contests are AMA-sanctioned, so they show up on the AMA calendar                                                                                                                                                                                                  |
| Promoters, series, shows                                        | ~15 (JConcepts and Dialed-RC-X series, FSEARA, Frank Tiano fly-in, AeroFest, Jets Over DeLand, eJet Fest…) | Found by sweeps; few enough to watch by hand                                                                                                                                                                                                                            |
| Crawler, drift and bash groups                                  | Dozens, informal                                                                                           | Facebook only: people layer                                                                                                                                                                                                                                             |
| Hobby shops                                                     | ~60–120 with RC, ~10 with tracks                                                                           | Brand dealer locators (HobbyTown, Horizon, Traxxas)                                                                                                                                                                                                                     |

OpenStreetMap has only ~20 RC sites in Florida (10–15 % coverage): a cross-check, not a census.

**Where they publish:**

| Channel                                                             | Share of events (estimate)                                                      | Readable by machine                                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Facebook pages, groups, events                                      | 50–60 % of all occurrences: most car race days, crawlers, much of FPV           | No (login wall, terms). People layer only                                                                                                                                        |
| Club websites                                                       | 25–35 %, mostly air clubs                                                       | In a sample of 21 club sites: 8 on **DualRates** (schema.org events + iCal, but 3 blocked us by region), 3 Wix, 2 WordPress, 1 Wild Apricot (RSS), 3 behind JavaScript bot walls |
| AMA calendar                                                        | 31 FL events in the next 6 months: nearly every sanctioned air contest          | HTML; terms forbid redistribution: ask AMA                                                                                                                                       |
| RCSignup                                                            | 12 big FL car events at 8 venues                                                | HTML, 10 s between requests                                                                                                                                                      |
| Google Calendar embeds                                              | 5–10 %                                                                          | ICS, but blocked by Google's robots.txt                                                                                                                                          |
| Newsletters and flyers                                              | 5–10 %, often the only channel of small clubs (5 of 26 sampled have no website) | PDF / images: needs reading with AI (roadmap B4)                                                                                                                                 |
| Parks calendars, local news, Eventbrite/AllEvents, YouTube, Discord | Each under 5 %                                                                  | Mixed                                                                                                                                                                            |
| Model Aviation's District V column                                  | Names upcoming District V events monthly                                        | RSS feed                                                                                                                                                                         |

**What this means for the design:**

- **Headline events are mostly on the open web; recurring days are mostly on Facebook.** Discovery can aim at near-complete coverage of headline events. Recurring days come from venue schedules plus organisers (layer 4).
- **Platform adapters beat site adapters.** One DualRates reader covers a large share of air clubs; Wix Events, Wild Apricot and WordPress event plugins cover most of the rest.
- **Partnerships unlock whole channels at once:** DualRates (the region block), MultiGP (FPV), AMA (calendar and club list), RCSignup, and the clubs on Google Calendar. Asking is cheaper and cleaner than any crawler.
- **About 15 % of club sites sit behind bot walls**, and some clubs have no site: those organisers go straight to outreach.

## Four layers

```text
 1 CENSUS            2 CHANNELS            3 EVENTS                        4 PEOPLE
 who organises  ──►  where each one   ──►  a) watch known channels    ◄──  organiser submissions,
 RC events in FL     publishes             b) read aggregators              member tips, partnerships
 (hosts, places)     (sources)             c) sweep the open web
                                           d) standing monitors
        ▲                                         │
        └──── new organiser found in an event ────┘   (the snowball)
```

### Layer 1 — Census: who organises events

A list of every organiser and every place in Florida, rebuilt every quarter and whenever the snowball finds someone new. Built from authoritative directories first (they are complete for what they cover), then from entity-search tools for what directories miss (shops, promoters, unaffiliated groups), then from places: a field or track with no known organiser is a lead. Output: rows in `hosts` and `places`.

Order of the first census: the FAA FRIA and fixed-site layers (air clubs and fields, with coordinates; we store no point-of-contact data), ROAR, RCSignup and LiveRC (car tracks), AMYA Region 7 (boats), the MultiGP chapters we can see, the promoters already known, then Parallel FindAll for clubs, tracks and shops none of those list. The AMA Club Finder is used only to find each club's website.

### Layer 2 — Channels: where each organiser publishes

For each organiser, find every channel and how readable it is: an ICS feed, schema.org event data, a WordPress events API, a plain HTML calendar page, a PDF newsletter, a Facebook page (we only link to it). The cheapest reliable channel becomes a `source`; the others are recorded so a human knows they exist. A census organiser with no machine-readable channel is a target for outreach (layer 4), not a dead end.

The probe recognises the site's platform first (DualRates, Wix, WordPress, Wild Apricot, Google Sites, GoDaddy) because the platform decides the reader: platform readers cover dozens of clubs each.

### Layer 3 — Events: four ways in

- **a) Watch known channels.** The workhorse: cheap, exact and early, because organisers publish on their own channels first. The readers built on 2026-10-22 (ICS, JSON-LD) are this layer.
- **b) Read aggregators** that already collect events for one discipline (RCSignup for cars, MultiGP for FPV, AMA with permission). Wide coverage per request, but later and less detailed than the organiser.
- **c) Sweep the open web** on a schedule with a fixed matrix of searches (below), through a search or "find all" API. Finds the long tail and new organisers.
- **d) Standing monitors**: queries a provider re-runs continuously and that notify us when a new matching page appears. The early-warning system between sweeps.

### Layer 4 — People

Organisers publishing with us (a 30-second form that reads a pasted link or flyer, an ICS feed they can embed), members sending tips, partnerships (AMA District V, MultiGP chapters, the big tracks). This is the only way into Facebook groups and Discord. It enters the engine as one more source, with its own trust level.

The first requests to send, each unlocking a whole channel: **AMA** (calendar and club list), **DualRates** (the region block on club sites), **MultiGP** (FPV chapters and races), **RCSignup** (car events), and the **clubs that publish on Google Calendar** (their feed, with permission).

## Open-web sweeps: the search matrix

Searches are generated, not typed, from four vocabularies, and every search keeps its own score so we spend where it pays:

| Axis        | Examples                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event words | fly-in, fun fly, airfest, jet rally, warbirds, float fly, swap meet, auction, race, club race, points series, nationals, regional, contest, open house, toys for tots fly |
| Hobby words | RC, R/C, radio control, model aircraft, AMA sanctioned, FPV, drone racing, MultiGP, crawler, ROAR, IMAC, pattern, sailplane, model yacht                                  |
| Places      | Florida / FL, the 7 regions (South, Southwest, Central, Tampa Bay, Northeast, North Central, Panhandle), the 30 largest cities, every county with a known field or track  |
| Time        | the next 6 months by name and year ("February 2027"), "2027", "this weekend"                                                                                              |

- **Yield decides frequency.** Each search records how many _new, verified_ events it found per run and per dollar. High-yield searches run weekly; zero-yield ones are cut to monthly, then retired. A fixed baseline set runs every time so the measurement stays comparable.
- **Known false friends get filtered at verification, not at search:** full-scale aviation fly-ins (EAA chapters, Sun 'n Fun), kite festivals, drone light shows, Red Cross ("RC") events, real car racing, video-game "RC" events. Each becomes a test case.

## From lead to event

Discovery never publishes anything. It produces **leads**: a URL plus which method and which search found it. A lead is then fetched and read like any other page (politely, with evidence), and checked against five criteria before it can become a sighting: it's an **RC model** event (not full-scale), it's **in Florida** (or a road trip we chose to list), it has a **date**, it's **open to the public** (not a board meeting), and it isn't already known. A lead whose page is an organiser's own site also proposes a new organiser and source for the census.

Keeping leads separate from sightings is what makes measurement possible: for every event we know which methods found it, when, and at what cost.

## Measuring completeness

| Measure              | What it answers                                                    | Target to start with                   |
| -------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Recall vs golden set | Of the events we verified by hand, how many did the engine find?   | ≥ 95 % of public-web events            |
| Capture–recapture    | How many events exist that _no_ method found?                      | Estimated missing < 10 %               |
| Lead time            | Days between our discovery and the event (and the organiser's own) | 90 % found ≥ 30 days before the event  |
| Precision            | Share of leads that turn out to be real Florida RC events          | Watched, not a gate: cheap to filter   |
| Coverage by stratum  | Recall by discipline × region × organiser type                     | No stratum below 80 %                  |
| Cost per new event   | Dollars of search per verified event                               | Watched against the monthly budget     |
| Social-only share    | Golden-set events that exist only on Facebook/Discord              | Sizes the outreach work, not a failure |

**Golden set.** A list of every Florida RC event through April 2027, built by hand from every channel including Facebook (read by a person, never scraped). It is the yardstick, and it is the first thing to build: without it no tool comparison means anything.

**Capture–recapture**, the way ecologists count fish in a lake: if the census-and-watch method finds 120 events, the open-web sweep finds 90, and 80 are found by both, the lake holds about (120 + 1)(90 + 1)/(80 + 1) − 1 ≈ 135 events, so roughly 135 − 130 = 5 events were found by neither. It assumes the methods are independent, which they aren't fully (big events are easy for everyone), so we compute it per stratum and treat it as a floor on what we're missing, not an exact count.

## Tools (checked 2026-10-22)

The rule that shapes everything: **search tools give us leads, never data.** Parallel's terms forbid using its outputs to "create databases" (§2(c)(vi)(B)) and say outputs must not be stored or passed on in several cases (§2(b)(i), §4(b)); Exa forbids publishing or making derivative works of anything obtained through its services (§4.2(a)); Brave forbids building a database of its results without a storage plan (§3(b)(i)). So a tool's answer is used for one thing: a URL worth reading. We then fetch the organiser's page ourselves, under our own robots.txt rules, and every fact and quote we store comes from our copy. Whether we may keep the list of lead URLs and the query history is the question to put to Parallel and Exa in writing before going live (roadmap C4). Parallel and Exa may also train on what we send them; our queries are public hobby searches, so that is acceptable.

| Layer             | Tool                                                                                                                                                        | Why                                                                                                                                       | Cost for Florida                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1 Census          | Official directories (AMA club finder, ROAR, LiveRC, MultiGP chapters, FAA FRIAs, OpenStreetMap), then **Parallel FindAll** for organisers directories miss | Directories are complete for what they cover; FindAll builds entity lists ("RC clubs and tracks in Florida") from plain-language criteria | Directories free; FindAll a few dollars per run   |
| 1 Census, once    | **Common Crawl** URL index (latest crawl Oct 2026), read with DuckDB over HTTPS                                                                             | Finds club sites and event pages by domain and path patterns (`fun-fly`, `fly-in`, `swap-meet`), free                                     | Free                                              |
| 2 Channels        | Our own fetcher: probe each site for ICS links, schema.org data, WordPress events APIs, sitemaps                                                            | Deterministic, free, respects robots.txt                                                                                                  | Free                                              |
| 3a Known channels | Our own fetcher and readers, with conditional requests and content hashes to spot changes                                                                   | Already built; no paid page monitor needed                                                                                                | Free                                              |
| 3c Season sweep   | **Parallel FindAll** with event criteria (RC model event, Florida, date window), `exclude_list` = events we already know                                    | One run lists a season's events with a citation per criterion; re-runs only pay for new ones                                              | ≈ $3 (base) to $17 (core) per run of ~100 matches |
| 3c Weekly sweep   | **Parallel Search** (has date and domain filters) **and Brave Search** (an independent index)                                                               | Two different indexes make two independent "captures" for capture–recapture                                                               | Under $5 a month                                  |
| 3d Monitors       | **Parallel Monitor**, a handful of daily queries ("RC fly-in Florida", "FPV race Florida", "RC swap meet Florida")                                          | Notifies new matching pages; only watches from creation onwards, so it complements sweeps                                                 | ≈ $0.10 per monitor a month                       |
| Second opinion    | **Exa Websets** (bake-off only)                                                                                                                             | Strictest terms and needs a paid plan for the API; useful to measure against                                                              | Free tier: 25 results                             |
| Not used          | Google Custom Search (closed to new customers), Bing Search API (retired Aug 2025), SerpAPI (scrapes Google), PredictHQ (no hobby events)                   | —                                                                                                                                         | —                                                 |

Parallel FindAll has never been shown on events (every example is companies or people), so it has to earn its place in the bake-off. Monitors and scheduled sweeps are background jobs: locally they run from a command; in production they need Itaca engineering (roadmap C2).

## The bake-off (roadmap B3)

Run once the golden set exists and there are API keys:

1. **Same question to every method:** FindAll (preview → base → core), Exa Websets (free tier), 40 searches from the matrix through Parallel Search and through Brave, and the census-and-watch path (our own sources).
2. **Score each method** against the golden set: recall, unique finds (each one verified by hand and added to the golden set if real), precision, cost per true event, lead time, and how good its pointer to the source page is.
3. **Capture–recapture across methods**, per discipline and region, to estimate what all of them miss.
4. **Run one Parallel Monitor daily for two weeks** and count what it caught before the weekly sweep did.
5. **Decide the mix** and the budget with numbers, and record it in `DECISIONS.md`.

## Data the engine needs for this (to build after approval)

| Table               | What it holds                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `discovery_queries` | Every search or criteria set: method, text, stratum (discipline × region × kind), cadence, running yield and cost |
| `discovery_runs`    | Each run of a query: when, provider run id, cost, how many leads                                                  |
| `leads`             | Each URL a method pointed at, normalised: status (new → read → event, organiser, rejected, duplicate) and why     |
| `lead_hits`         | Which run found which lead, and when: the capture history that capture–recapture and lead time are computed from  |

The golden set lives in the repository as a reviewed CSV, so changes to the yardstick are visible in pull requests.

## Cadence and budget

| What           | How often                                                          |
| -------------- | ------------------------------------------------------------------ |
| Census rebuild | Quarterly, plus on every new organiser from the snowball           |
| Known channels | Weekly; daily for sources with an event in the next 14 days        |
| Aggregators    | Daily to weekly, as their terms and robots.txt allow               |
| Open-web sweep | Weekly baseline + yield-ranked searches                            |
| Monitors       | Continuous, at the provider's cadence                              |
| Recall review  | Monthly against the golden set; quarterly capture–recapture report |

## Guardrails

- Same rules as the fetcher: obey robots.txt and terms, identify ourselves, never get around a login or bot wall, never scrape Facebook.
- Discovery tools are used within their terms; whether we may store and republish what they return is checked before any of them goes live (roadmap C4).
- We store facts and short quotes with a link to the source, never whole pages or flyers, and nothing personal from descriptions.

## Order of work

1. **Golden set** (roadmap B1): every Florida RC event through April 2027, verified by hand from every channel, Facebook included (read by a person). Without it nothing below can be measured.
2. **Census v1**: organisers and places from the lists above into `hosts` and `places`, then a channel probe of every website.
3. **Discovery tables and the lead pipeline** (`discovery_queries`, `discovery_runs`, `leads`, `lead_hits`), with Parallel and Brave clients behind API keys.
4. **Bake-off**, then the chosen mix running weekly from a command.
5. **Platform readers** in the order the census shows they pay off (DualRates first if the region block is lifted).
6. **Outreach** to AMA, DualRates, MultiGP, RCSignup and the Google Calendar clubs, in parallel from day one.

## Decisions for the owner

- **API keys:** a Parallel account (new accounts get free credits) and a Brave Search API key, saved in `apps/api/.env`, never in chat or git.
- **Terms question to Parallel and Exa:** "We use your results only to find public URLs, then fetch and read the organiser's own page ourselves. May we keep the list of URLs your API returned and our query history?"
- **Who builds the golden set:** the public web can be done by an agent; Facebook groups need a person with an account.
- **Outreach:** who signs the requests to AMA, DualRates, MultiGP and RCSignup.
