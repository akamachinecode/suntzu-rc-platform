---
name: plan
description: Turns an idea or a request for something new into an approved written plan before building it - business questions, a short specification in docs/specs/, and small slices delivered one at a time. Use when someone wants a new feature, page, flow or integration, or anything that touches data, users, payments or an external service ("I want…", "add…", "we need…", "quiero que…", "añade…", "necesitamos…").
---

# Plan

Agree on what to build before building it. The specification is for people: it records the business decisions, the scope and how we'll know it works. Keep it to what matters; models don't need it to know how to code.

## 1. Understand

Read `AGENTS.md`, `docs/SYSTEM.md`, `docs/bits/README.md`, `docs/DECISIONS.md`, any related spec in `docs/specs/`, and the code the request touches. Don't ask what the code already answers.

## 2. Ask, in business terms

Ask in rounds of three to five questions, each with your recommended answer, so the person can just say "yes" or correct you. Never ask them to choose libraries or architecture. Cover, when relevant:

- Who uses it, and who must not be able to.
- What starts it and what should happen, step by step.
- What data it needs, where it comes from and how long it's kept.
- What happens when something fails, and who gets told.
- What's explicitly out of scope for now.

Stop asking when you can describe what "done" looks like in a few sentences the person agrees with.

## 3. Check the capability list

Walk the checklist in `docs/specs/README.md`. Mark what this feature needs. Anything on the "When to stop" list in `AGENTS.md` (payments, personal data, permissions, infrastructure, integrations) goes under "Needs Itaca engineering" and is not built until an engineer agrees.

## 4. Write the specification

Copy `docs/specs/_template.md` to `docs/specs/NNNN-short-name.md` (next free number) and fill it in:

- Problem, goals and what's out of scope.
- User stories, most important first.
- Capabilities touched (from step 3) and bits created or changed (`docs/bits/`).
- Acceptance criteria in plain "When… then…" sentences that someone can check.
- Slices: each one small enough for a single pull request, useful on its own when possible, with what it's blocked by.
- Open questions, each with who should answer it.

## 5. Get approval

Show a one-screen summary: what will be built, the slices, what's out of scope and anything that needs an engineer. Ask for approval. When approved, set `Status: Approved` with the date in the spec, and add the decisions it records to `docs/DECISIONS.md`.

## 6. Build slice by slice

For each slice, in order:

1. Create a branch `feat/<short-name>-<slice number>`.
2. Build it, inside the rules of `AGENTS.md`.
3. Create or update the bit files it touches in `docs/bits/`.
4. Tick the slice in the spec and deliver it with `/ship`.

When the last slice is merged, set `Status: Done`. If something new changes the plan, update the spec first, tell the person and get their OK before continuing.

Adapted for Itaca from Anthropic's `write-spec` and Matt Pocock's `grilling`, `to-spec` and `to-tickets`. See `../CREDITS.md`.
