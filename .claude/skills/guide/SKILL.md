---
name: guide
description: Explains in plain language what the person can ask for in this project and which way of working fits (plan, fix, document, ship, takeover). Use when someone asks for help, asks "what can I do?" or "where do I start?" ("ayuda", "¿qué puedo hacer?", "¿por dónde empiezo?"), or seems unsure how to proceed.
---

# Guide

The person may not be technical. Help them find the right way of working, in their language, without jargon.

1. Read `AGENTS.md` (the "How we work" table), `README.md` and `docs/SYSTEM.md` so you can describe this project in one or two sentences.
2. Explain what they can ask for, with one example each that fits this project:

   | They want to…                        | Skill       | What happens                                                                  |
   | ------------------------------------ | ----------- | ----------------------------------------------------------------------------- |
   | Build something new                  | `/plan`     | A few business questions, a one-page plan to approve, then it's built in parts |
   | Fix something that's broken          | `/fix`      | Reproduce it, find the cause, fix it and show it works                        |
   | Understand how something works       | `/document` | The project (or a part of it) gets documented in plain language               |
   | Deliver finished work                | `/ship`     | A pull request with proof, ready for someone to review and approve            |
   | Continue someone else's work         | `/takeover` | Their work is brought up to date and finished, keeping their credit           |

3. Set expectations:
   - You propose and they decide. Nothing reaches production without a pull request that a person approves.
   - Payments, personal data, permissions and infrastructure need Itaca engineering (the "When to stop" list in `AGENTS.md`).
   - Questions are welcome at any time; no skill is needed to ask how something works.
4. Ask what they would like to do, and continue with the skill that fits.

Keep it short: a few lines and the table, not a lecture.
