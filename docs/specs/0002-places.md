# 0002 — Places and clubs

- **Status:** Approved 2026-10-27
- **Requested by:** the owner (Alejandro), 2026-10-27
- **Approved by:** the owner, 2026-10-27

## Problem

"Where can I fly or race near me?" has no good answer today: AMA's club finder has no map of fields, FAA's map of recognised areas is hard to read, and searches for "RC track near me" return spam. Every event also hangs off a place, and Servo only knows six of them.

## Goals

- Every flying field, track and recognised area in Florida is on one map, with a page that says how to visit, who runs it and when its details were last checked.
- Every club and track has a page with its upcoming events, so organisers have a reason to keep it right.
- Anyone can check "Can I fly here?" for a point on the map and get a plain answer with the rules that apply.

## Out of scope

- Private fields that aren't in a public register: they're listed only when their club asks.
- Official airspace authorisation (LAANC): we explain and link to the FAA's tools; Servo never authorises a flight.
- Live wind and temporary flight restrictions (later: "Conditions" in `ROADMAP.md`).

## User stories

- As a pilot, I want a map of every field and track near me, by discipline.
- As a newcomer, I want to know whether I can just show up or must join first.
- As a drone pilot, I want to know if I may fly at a spot, and which rules apply.
- As a club officer, I want our field's page to be right, and to fix it when it isn't.

## Capabilities touched

- **Data:** places gain access rules, disciplines, verified date and evidence; new tables for airports and controlled airspace (FAA public data) and ZIP code centres (US Census public data).
- **Clients:** public pages and API only.
- **Operations:** importers run from a command; each place keeps the link to the record it came from.

## Bits

- New: `census.import` — public registers become places and hosts.
- New: `places.get`, `hosts.get` — a page per place and per club or track.
- New: `airspace.check` — "Can I fly here?".
- Changed: `places.list` (filters, every place on the map).

## Acceptance criteria

- When the census runs, then every FAA-recognised identification area and recreational fixed site in Florida is a place, with its organisation as the host when the register names one, and no personal contact details are stored.
- When someone opens `/places`, then they see every place on a map and in a list, filterable by kind and discipline, with "near me" computed in the browser.
- When someone opens a place's page, then they see where it is, who runs it, how to visit (open to the public, guests with a member, members only), its upcoming events, the rules that apply and when its details were last checked, with the source.
- When someone opens a club's or track's page, then they see its places, upcoming events, a link to its site and whether it is verified.
- When someone checks a point, then they get the nearest airports and whether the point is inside controlled airspace or a recognised area, the rules that apply, and a link to the FAA's B4UFLY/LAANC tools, with a clear note that this isn't an authorisation. The point isn't stored or logged.

## Slices

- [x] 1. Census: FAA recognised areas and fixed sites, Florida airports and controlled airspace, ZIP centres (blocked by: —) — `pnpm census`, 2026-10-27
- [ ] 2. `/places` map and list, a page per place and per club or track (blocked by: 1)
- [ ] 3. "Can I fly here?" (blocked by: 1)

## Open questions

- Which car tracks, MultiGP chapters and boat clubs to add beyond the FAA registers, and from which directories (LiveRC, ROAR, MultiGP, AMYA) — who should answer: the owner, after checking each directory's terms.

## Needs Itaca engineering

- No.
