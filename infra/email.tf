# Email: Amazon SES sends from var.email.domain, signed with DKIM. Each stage has its own sending
# domain (production suntzurc.com, staging staging.suntzurc.com), so stages never share an SES
# identity and one can be deleted without touching the others. Until SES production access is
# granted (docs/LAUNCH.md), SES only sends to verified addresses.

resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.email.domain
}

# DKIM records are DNS only (grey cloud): mail servers read them directly.
resource "cloudflare_dns_record" "dkim" {
  count = 3

  zone_id = module.zone.id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.email.domain}"
  type    = "CNAME"
  content = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"
  ttl     = 1
  proxied = false
}

# DMARC starts at p=none (report only); move it to p=quarantine once the reports are clean. There must
# be exactly one _dmarc record per domain: two cancel each other out, so reports go in this one.
locals {
  dmarc_rua = length(var.email.dmarc_reports) > 0 ? " rua=${join(",", [for address in var.email.dmarc_reports : "mailto:${address}"])}" : ""
}

resource "cloudflare_dns_record" "dmarc" {
  zone_id = module.zone.id
  name    = "_dmarc.${var.email.domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=none;${local.dmarc_rua}\""
  ttl     = 1
  proxied = false
}
