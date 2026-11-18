---
name: takeover
description: Picks up someone else's pull request, branch or unfinished work and finishes it while keeping their credit - understand the goal, compare it with the current code, decide whether to continue, rework or close, then deliver. Use for "take over this PR", "continue this branch", "finish what X started", old or abandoned work ("retoma", "termina lo de", "continúa esta rama").
---

# Takeover

Finish the original goal, not necessarily the original code, and keep the original author's credit.

1. **Read everything.** The pull request or branch, its description, commits, review comments, linked spec and bits, and any later corrections. Write down the smallest goal it was trying to reach.
2. **Compare with today.** Fetch `main` and look at what changed since the work started. Has the same problem been solved elsewhere? Did the data model, APIs or structure change? Would landing it bring back something that was removed on purpose?
3. **Decide, and say why:**
   - **Continue:** the goal still matters and the approach still fits. Bring it up to date and finish it.
   - **Rework:** the goal still matters but the approach no longer fits. Explain the smallest rewrite and ask before doing it.
   - **Close:** it's no longer needed. Show the evidence and ask; never close someone else's work without permission.
4. **Keep the credit.** Continue on a new branch built from the original commits, preserving their authors. Mention and link the original work in the pull request, with a `Co-authored-by:` line for each original author.
5. **Finish and prove it** inside the rules of `AGENTS.md` with `/verify`, then deliver with `/ship`.

**Replacing an old system** (a PHP site, a spreadsheet, a previous app): the old system is the reference. Before switching, run the same inputs through both and compare: the same pages, the same form submissions, the same API calls, ideally a sample of real (anonymised) traffic. Ignore differences that don't matter (whitespace, dates, IDs), and list the intended ones in the spec under "Approved differences". Any other difference is a bug or a breaking change to discuss. For an inherited codebase, also ask Itaca engineering for a full security audit before it goes live.

Never force-push or rewrite someone else's branch, and never merge.

Adapted for Itaca from Theo Browne's tstack skills `takeover` and `modernize`. See `../CREDITS.md`.
