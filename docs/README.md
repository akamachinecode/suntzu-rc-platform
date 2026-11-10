# SunTzu RC docs

Everything about how SunTzu RC works, how it's run and how to take part. SunTzu RC is the free calendar, map and community of RC in Florida: events read from organisers' own pages, every field and track from the FAA registers, clubs that publish for free, and guides that take planes, helicopters and cars apart. The platform is at [suntzurc.com](https://www.suntzurc.com), and its code is open on [GitHub](https://github.com/akamachinecode/suntzu-rc-platform).

## Start here

| I want to…                                    | Read                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Run SunTzu RC on my computer                  | [Run it locally](./guides/RUN-LOCALLY.md)                                       |
| Fix or improve something                      | [Your first contribution](./guides/FIRST-CONTRIBUTION.md)                       |
| Know the rules of the project                 | [Contributing](../CONTRIBUTING.md), [Rules for people and agents](../AGENTS.md) |
| Understand what runs where                    | [System](./SYSTEM.md)                                                           |
| Understand how a change reaches the live site | [From code to production](./DELIVERY.md)                                        |
| See how events are found, merged and verified | [Events engine](./EVENTS-ENGINE.md)                                             |
| Know why something is the way it is           | [Decisions](./DECISIONS.md)                                                     |
| Report a security problem                     | [Security policy](../SECURITY.md)                                               |

## What's in here

- **Guides:** step-by-step walk-throughs for newcomers.
- **Contributing:** how to take part, the rules every change follows, the code of conduct and the security policy.
- **Architecture:** the map of the system, how code reaches production, and the events engine's design.
- **Operations:** running, deploying and monitoring SunTzu RC on AWS behind Cloudflare, and the checklist for going live.
- **Project:** why SunTzu RC exists (the landscape of RC platforms), the roadmap, the discovery work and every decision made so far.
- **Specifications:** one per feature, written before building it, with what's in scope and how we know it works.
- **Bits:** every piece of behaviour someone can trigger, end to end, from the screen to the database.

These pages are generated from the Markdown files in the repository, so they're always as current as the code. Every page links to its source; to fix one, use **Edit on GitHub** at the bottom and open a pull request.
