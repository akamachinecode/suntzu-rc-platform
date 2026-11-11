# 0008 — Phones that feel right, a shorter home and a Learn page worth booking from

- **Status:** Approved 2026-11-11
- **Requested by:** the owner, 2026-11-11
- **Approved by:** the owner, 2026-11-11 (who then added the hero's lag, smooth motion, the filters and a phone pass on every page: slices 2, 5 and 6)

## Problem

Most visitors arrive on a phone, and that's where SunTzu RC feels worst. Scrolling the home still stutters when the Air, Rotor and Ground titles slide in. The menu and the search open on a white panel that doesn't match the page, and the menu stays open after you pick a page. The home also carries a section ("You move a stick. Six parts do the rest.") that feels forced. "Learn with us" is the page that turns a visitor into someone who asks for a lesson, yet it is the plainest page on the site.

Checked while planning: the crew console (`/crew`), with its queue and the contact form's inbox, is only shown to the accounts listed in `CREW_EMAILS`. Everyone else gets "Crew only", and the API refuses them. Members already help without publishing: what they send (`/submit`) and the corrections they suggest wait in the crew's queue. Nothing changes there.

## Goals

- On a phone, the menu and the search share the page's gray, and the menu closes as soon as you pick a page.
- The home is shorter: no "You move a stick" section, on phones or on desktop.
- Scrolling the home on a phone is smooth, the hero's servo included, measured before and after, and the owner confirms it on their own phone.
- The scroll-linked animations feel smooth again, without bringing back a smooth-scroll library that makes the whole page lag.
- Every page reads comfortably on a phone, with room to breathe, and the events and places filters suit a thumb.
- "Learn with us" matches the home's level of craft and makes asking for a lesson the obvious next step.
- The crew's review cards read in plain words, with the source's exact words available but out of the way.

## Out of scope

- **Prices for lessons:** none for now. People ask first, and the crew answers with what it costs.
- **Names or photos of the three of us** on the Learn page: the owner chose not to show them.
- **Changing who is crew** or letting members publish: the crew stays whoever `CREW_EMAILS` lists.
- **Amazon SES production access** (denied on the first request): an operations task handled separately (`docs/LAUNCH.md`, step 4).
- **Dark mode, new pages or new content** beyond the Learn page's layout and copy.

## User stories

- As a visitor on a phone, I want the menu to close when I pick a page, so I land on the page instead of under a menu.
- As a visitor on a phone, I want the home to scroll smoothly, so the site feels well made and I keep reading.
- As a newcomer, I want "Learn with us" to show me clearly what the crew can do for me and how to ask, so I book a lesson.
- As a crew member, I want review cards in plain words, so I can decide quickly without reading raw source code.
- As a visitor on a phone, I want to filter events and places with my thumb, so I find what's near me without zooming or scrolling sideways.

## Capabilities touched

- **Front door, identity, data, processes, business systems, AI, clients, physical:** none. No new tables, routes, variables, services or dependencies.
- **Operations:** the home's scrolling is measured before and after (method in `docs/OPERATIONS.md`, "Performance"), and the numbers go into `docs/DECISIONS.md`.

## Bits

- Changed: `crew.queue`: review cards show what the engine understood in plain words (dates, kinds, disciplines, places), with the source's exact words folded under each field.
- No new bits: the menu, the search panel, the home and the Learn page are screens; the Learn page's buttons lead to `contact.send` with the topic already chosen, as today.

## Acceptance criteria

- When a visitor on a phone opens the menu, then its panel has the page's gray background (`bg-background`), separated from the page by the header's line.
- When they tap any page in the menu, then that page opens and the menu is closed. Escape, tapping outside the menu and any change of page close it too.
- When a visitor on a phone opens search, then the full-screen panel has the page's gray background. On larger screens the search box looks as it does today.
- When anyone opens the home, on any screen, then there is no "You move a stick" section, and the guides follow Ground directly.
- When the home is scrolled on a phone, then:
  - Measured in Chrome with a phone screen and the CPU 4× slower, scrolling from the hero to the guides has fewer long tasks and less blocked time than before, and no task over 100 ms while a title slides in. The before and after numbers are recorded.
  - The servo's horn, the prop, the wheel and the titles move on the browser's compositor (scroll-driven animations), so they keep pace with the finger even while the page is busy.
  - The 3D dioramas keep their 3D, hold still while the finger is scrolling, resume a moment after it stops, and draw at 30 frames a second on phones. Desktops keep 60.
  - The Air, Rotor and Ground titles slide in smoothly. On a browser that can't animate them natively, they sit in place, without stuttering.
  - The owner scrolls the home on their own phone in staging and it feels smooth. If the dioramas still stutter there, phones show one still frame of each scene instead (the fallback the owner accepted).
- When the home is scrolled on a computer (a mouse or trackpad), then the same parts glide after the scroll on a light spring, settling in about a fifth of a second, while the page itself scrolls natively.
- When someone opens `/learn`, then:
  - Each of the five services has its own section with an illustration and a button that opens the contact form with that topic chosen.
  - "Book a lesson" is the main button at the top and at the end.
  - There are no prices and no names, and the page has one `<h1>`, a title and a description.
  - It looks right on a phone and on a desktop. Its figures load only when they come near the screen, and its HTML stays under 200 KB.
- When a visitor opens `/events` or `/places` on a phone, then:
  - The filters take one row with a button showing how many are on.
  - The button opens a panel with every filter, sized for a thumb, and a button to see the results.
  - The results start on the first screen.
  - On a desktop, the filters stay as they are.
- When any public page is opened on a phone (390 px wide), then:
  - Nothing scrolls sideways.
  - Text keeps at least 20 px from the screen's edges.
  - Every button and link is at least 44 px tall.
  - Sections have room between them.
  - The before and after screenshots of each page are in the pull request.
- When a crew member opens the queue, then dates read as dates ("Sat, Nov 22, 2026"), kinds and disciplines as words ("Fly-in", "Planes and jets"), and places as a name and town. The source's exact words for each field are one tap away, laid out readably rather than as raw code.

## Slices

- [x] 1. **Phone menu and search, and a shorter home:** the gray panels, the menu that closes, and the "You move a stick" section removed with its code (`signal-bench.tsx`). (blocked by: —)
- [x] 2. **Smooth scrolling on phones, and smooth motion on computers:** measure, then fix the causes found in the code, then measure again and record both:
  - the dioramas start building while the visitor scrolls past "Air", which blocks the phone for a moment;
  - they keep drawing during the scroll;
  - the servo, the prop, the wheel and the titles move with JavaScript instead of the browser's own scroll animations;
  - the hero changes height when the address bar hides.

  On computers, the same parts follow the scroll through a light spring. The owner then checks on their phone in staging. (blocked by: 1, which changes what is measured)

- [x] 3. **"Learn with us", redesigned:**
  - A hero with the main button, and a menu of the five services.
  - The five services in colour bands like Air, Rotor and Ground, each with a drawing of one of the guides' figures (drawn once as an image, so the page stays light) and a link to move it yourself in the guide:
    - lessons: thumb to elevator;
    - first model: the balance point;
    - advanced: the swashplate.
  - The scene and the rules link to "Where to fly", the clubs, the calendar, "Try it with a club", "Can I fly here?" and "Flying legally".
  - "How it works" as tickets in the home's style, a short list of questions people ask before a first lesson, and a closing call to book. (blocked by: —)
- [ ] 4. **Crew review cards in plain words:** formatted values next to what we publish, and the source's exact words folded under each field. (blocked by: —)
- [x] 5. **Events and places filters for phones:** one row with a "Filters" button (and how many are on) that opens a panel with every filter; the map becomes a view of its own (List · Map · Month), loaded only when opened; the results start on the first screen. Desktops keep today's filters. (blocked by: —)
- [ ] 6. **A phone pass on every page:**
  - Screenshots of every public page at 390 px wide, before and after.
  - More room at the edges and between sections, and touch targets of at least 44 px.
  - Fixes for whatever the screenshots show.

  (blocked by: 3 and 5, so the new pages and filters are part of the pass)

Build order: 2, 3, 5, 6, then 4.

## Open questions

- None for now. A visitor's question that needs the owner while building (for example, what the questions section should promise about a first lesson) is asked before it's published. Who should answer: the owner.

## Needs Itaca engineering

- No. Nothing on the "When to stop" list: no data, roles, payments, infrastructure or integrations change.
