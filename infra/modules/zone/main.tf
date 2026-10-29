# Finds the Cloudflare zone of a hostname: the longest parent domain that exists in the account
# (app.client.co.tt → tries app.client.co.tt, client.co.tt and co.tt).
terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

locals {
  labels     = split(".", var.domain)
  candidates = [for i in range(length(local.labels) - 1) : join(".", slice(local.labels, i, length(local.labels)))]
}

data "cloudflare_zones" "candidate" {
  for_each = toset(local.candidates)
  name     = each.key
}

locals {
  matches = [
    for name in local.candidates : data.cloudflare_zones.candidate[name].result[0]
    if length(data.cloudflare_zones.candidate[name].result) > 0
  ]
}
