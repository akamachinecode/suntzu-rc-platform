## What changed

<!-- One or two sentences, in plain language. -->

## How to check it

<!-- Pages/URLs to open, steps to follow. -->

## Proof

<!-- The block from /verify: checks, bits' tests, what was seen working, triggered checks, what wasn't verified. -->

## Security

<!-- Not triggered, or the /security verdict (BLOCK · PASS WITH ISSUES · PASS) and its NOT MET / UNVERIFIED rows. -->

## Checklist

- [ ] `pnpm check` passes locally (and `pnpm test:a11y` if a page changed)
- [ ] Every new or changed bit has its doc in `docs/bits/` and its test in `e2e/`, and they pass
- [ ] No check was weakened (no `.skip`, retries, lowered limits, disabled rules)
- [ ] New environment variables are listed in `.env.example`
- [ ] New dependencies, services or data changes are recorded in `docs/DECISIONS.md`
- [ ] No secrets, credentials or personal data in the diff
