# Security policy

Thanks for helping keep SunTzu RC and its members safe.

## Report a vulnerability

**Please don't open a public issue or discussion.** Report it privately through GitHub instead:

1. Open [**Report a vulnerability**](https://github.com/akamachinecode/suntzu-rc-platform/security/advisories/new) (you need a GitHub account).
2. Describe what you found, where (a URL, a file, an API route) and how to reproduce it. A proof of concept helps.

Only the maintainers can see the report. We aim to reply within a week, keep you updated while we fix it and credit you in the advisory when it's published, unless you'd rather stay anonymous.

## What's covered

- The code in this repository.
- The live platform: `www.suntzurc.com` and `api.suntzurc.com`. Only the latest version is supported: fixes go to `main` and are deployed from there.

Not covered: findings in third-party services we use (report those to the vendor), denial of service by flooding, social engineering of the crew, and reports from automated scanners without a demonstrated impact.

## Testing in good faith

Test against your own copy whenever you can: the whole platform runs locally without any account (see [`CONTRIBUTING.md`](./CONTRIBUTING.md#run-it-on-your-computer)). If you must test the live site, don't access, change or delete other people's data, don't degrade the service, and stop and report as soon as you find something. We won't take action against anyone who reports in good faith and follows these rules.
