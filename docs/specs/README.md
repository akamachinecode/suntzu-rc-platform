# Specifications

One file per feature, written with the `/plan` skill before building it: `NNNN-short-name.md`, from [`_template.md`](./_template.md). A specification records the business decisions, the scope and how we'll know it works. It's approved by the person who asked for the feature, and its slices are delivered one pull request at a time.

## Capability checklist

Every specification walks this list and marks what the feature needs. Anything marked here that isn't already in the project is a decision to record in `docs/DECISIONS.md`, and anything on the "When to stop" list in `AGENTS.md` needs Itaca engineering before it's built.

| Area             | Ask                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Front door       | New domains or subdomains? Public forms that need Turnstile or rate limiting? Admin areas behind Cloudflare Access?                  |
| Identity         | Sign-in, roles or permissions? Single sign-on with the client's directory?                                                           |
| Data             | New tables or fields? Data from several customers in one database (isolation)? Personal data, retention or deletion? An audit trail? |
| Processes        | Scheduled jobs, queues, emails, SMS or push notifications, file uploads, real-time updates?                                          |
| Business systems | Payments or billing? ERP, CRM, accounting, Microsoft 365 or other company systems?                                                   |
| Operations       | What must be logged or alerted? What does it cost per month, and per customer?                                                       |
| AI               | A language model? Which data does it see, how is it evaluated, what does it cost?                                                    |
| Clients          | A mobile app or other systems calling this one?                                                                                      |
| Physical         | Devices, sensors, printers or plant systems?                                                                                         |
