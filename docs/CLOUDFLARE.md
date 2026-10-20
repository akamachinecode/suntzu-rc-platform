# Cloudflare

Cloudflare always sits in front of Itaca projects: DNS, TLS, CDN and WAF. The DNS zone for `example.com` lives in Itaca's Cloudflare account (or the client's, with Itaca access).

## Baseline zone settings

| Where                                 | Setting                  | Value                                               |
| ------------------------------------- | ------------------------ | --------------------------------------------------- |
| SSL/TLS → Overview                    | Encryption mode          | **Full (strict)** — never Flexible                  |
| SSL/TLS → Edge Certificates           | Always Use HTTPS         | On                                                  |
| SSL/TLS → Edge Certificates           | Minimum TLS version      | 1.2                                                 |
| SSL/TLS → Edge Certificates           | Automatic HTTPS Rewrites | On                                                  |
| SSL/TLS → Edge Certificates           | HSTS                     | On once HTTPS works everywhere (max-age ≥ 6 months) |
| DNS → Settings                        | DNSSEC                   | On                                                  |
| Security → WAF                        | Managed rules            | On                                                  |
| Security → Bots                       | Bot Fight Mode           | On (check it doesn't block legitimate APIs)         |
| Rules → Settings → Managed Transforms | Add security headers     | On                                                  |

## How this project connects

### SST (CloudFront behind Cloudflare)

SST manages the records itself through the Cloudflare API (`sst.cloudflare.dns({ proxy: true })` in `sst.config.ts`):

- It creates the ACM validation records and a **proxied** record pointing at the CloudFront distribution. Don't edit them by hand — change `sst.config.ts` instead.
- SSL/TLS mode must be **Full (strict)**. With Flexible, CloudFront returns 403s or redirect loops.
- Don't override the Host header in Cloudflare rules. Both Cloudflare and CloudFront cache; purge both if you change caching rules.

## After go-live

```bash
curl -sI https://example.com | grep -iE 'cf-ray|strict-transport|x-content-type'
```

`cf-ray` in the response means traffic goes through Cloudflare. Also run the domain through https://www.ssllabs.com/ssltest/ (target: A or A+).
