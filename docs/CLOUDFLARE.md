# Cloudflare

Cloudflare is the front door of every Itaca project and AWS is the house: everything that comes in goes through Cloudflare (DNS, TLS, WAF, DDoS and bot protection), and everything that runs or is stored lives in AWS.

## Account and access

- The zone for `example.com` lives in **the client's own Cloudflare account**, billed to them. Itaca joins as a member with the **Administrator** role plus **API Token Provisioning** ([roles](https://developers.cloudflare.com/fundamentals/manage-members/roles/)). Moving a zone between accounts later means re-adding it, changing nameservers, turning DNSSEC off first and reissuing certificates, so start in the right account.
- People sign in to the dashboard with Itaca's SSO ([dashboard SSO](https://developers.cloudflare.com/fundamentals/manage-members/dashboard-sso/), free on every plan).
- Deploys use an **account-owned API token** scoped to this zone and to the permissions it needs ([tokens](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)). Never a personal global key.
- Changes are kept in the account's audit log for 18 months.

## Baseline for every zone

| Where                                 | Setting                         | Value                                                                                                          |
| ------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| SSL/TLS → Overview                    | Encryption mode                 | **Full (strict)**, never Flexible                                                                              |
| SSL/TLS → Edge Certificates           | Always Use HTTPS                | On                                                                                                             |
| SSL/TLS → Edge Certificates           | Minimum TLS version             | 1.2                                                                                                            |
| SSL/TLS → Edge Certificates           | Automatic HTTPS Rewrites        | On                                                                                                             |
| SSL/TLS → Edge Certificates           | HSTS                            | On once HTTPS works everywhere (max-age ≥ 6 months)                                                            |
| DNS → Settings                        | DNSSEC                          | On                                                                                                             |
| DNS → Records                         | CAA                             | Allow `amazon.com` (ACM); Cloudflare adds its own CAs automatically                                            |
| DNS → Records                         | Proxy status                    | Website records proxied (orange). ACM validation and SES DKIM records DNS only (grey)                          |
| Security → WAF                        | Managed rules                   | On (Free Managed Ruleset; Cloudflare Managed + OWASP from Pro)                                                 |
| Security → WAF                        | Leaked credentials detection    | On                                                                                                             |
| Security → WAF                        | Rate limiting                   | At least one rule on sign-in and API routes                                                                    |
| Security → Bots                       | Bot Fight Mode                  | On for websites only. **Off on zones with an API**: no rule can skip it and it breaks webhooks and mobile apps |
| Rules → Settings → Managed Transforms | Add security headers            | On                                                                                                             |
| Rules → Transform Rules               | Origin lock header              | See "Origin lock" below                                                                                        |
| Analytics & Logs → Logpush            | HTTP requests + firewall events | To an S3 bucket in the client's AWS account, with a health notification                                        |
| Zero Trust → Access                   | Applications                    | In front of admin areas and staging (free for up to 50 users)                                                  |

Public forms use [Turnstile](https://developers.cloudflare.com/turnstile/) (free) instead of CAPTCHAs.

**Plan:** Free by default. **Pro** when the client needs the OWASP and Cloudflare managed rulesets or Super Bot Fight Mode. **Business** for an SLA, PCI or real-time logs. Record the choice in `docs/DECISIONS.md`.

## Email (Amazon SES)

- **SPF:** a custom MAIL FROM subdomain in SES (MX + SPF records) so SPF aligns with the domain.
- **DKIM:** SES Easy DKIM, three CNAME records, DNS only.
- **DMARC:** a `_dmarc` TXT record starting at `p=none`, moving to `quarantine` and then `reject` once reports are clean, with reports sent to Cloudflare's DMARC Management.

## Origin lock

Cloudflare only protects traffic that goes through it. Someone who reaches AWS directly skips the WAF, so every origin only accepts requests that carry a secret header that Cloudflare adds:

1. Generate a value: `openssl rand -hex 32` (letters and numbers only).
2. In Cloudflare: **Rules → Transform Rules → Modify Request Header → Create rule**, for all incoming requests: set static header `X-Origin-Verify` to that value.
3. In AWS: give the same value to the origin (see "How this project connects" below), then deploy.

Do it in that order: if AWS starts requiring the header before Cloudflare sends it, the site answers 403.

## How this project connects

### Terraform (AWS behind Cloudflare)

Terraform manages the records itself through the Cloudflare API (`infra/`):

- It creates the ACM validation records (DNS only), a **proxied** record for each hostname (`www`, `api` and the bare domain) pointing at the load balancer, and for each stage's sending domain the SES DKIM records and the `_dmarc` record (DNS only). Don't edit them by hand — change `infra/` instead.
- SSL/TLS mode must be **Full (strict)**. With Flexible, AWS returns 403s or redirect loops.
- Cloudflare doesn't cache pages here: Next.js decides how its pages are cached. Don't add Cloudflare cache rules for HTML, and don't override the Host header.
- The load balancer only accepts connections from Cloudflare's IP ranges, read at every deploy.
- The bare domain redirects to `www` at the load balancer (`infra/main.tf`).
- Terraform owns each stage's `_dmarc` record (`infra/email.tf`). To get reports in Cloudflare's DMARC Management, add the `rua=` address it gives you to that record in `infra/email.tf`, instead of letting the dashboard edit or add one: two DMARC records cancel each other out.
- The visitor's real IP reaches AWS in the `CF-Connecting-IP` header.

**Origin lock:** the SSM parameter `/rc-landing/<stage>/origin-verify-header` is `off` until you enable it. Once the Cloudflare transform rule from "Origin lock" above is in place:

```bash
aws ssm put-parameter --overwrite --type SecureString \
  --name /rc-landing/production/origin-verify-header --value <the same value>
```

Then deploy (merge to `main` or run the Deploy workflow). From then on, AWS answers 403 to any request that didn't come through Cloudflare. To turn it off again, set the parameter back to `off` and deploy.

## After go-live

```bash
curl -sI https://example.com | grep -iE 'cf-ray|strict-transport|x-content-type'
```

`cf-ray` in the response means traffic goes through Cloudflare. Also run the domain through https://www.ssllabs.com/ssltest/ (target: A or A+).

## Cloudflare's own services

Workers, R2, Pages and D1 are not part of the standard. Use them only for work that really belongs at the edge or moves a lot of data out (R2 for large downloads, a small Worker for redirects or an access gate), always in the client's account and in code, and record the decision in `docs/DECISIONS.md`. Inbound email (Email Routing) and Turnstile are fine to use.
