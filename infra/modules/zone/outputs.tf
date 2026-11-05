output "id" {
  value = try(local.matches[0].id, null)

  precondition {
    condition     = length(local.matches) > 0
    error_message = "No Cloudflare zone found for ${var.domain}: check that the zone exists and that CLOUDFLARE_API_TOKEN can read it."
  }
}

output "account_id" {
  description = "Cloudflare account that owns the zone."
  value       = try(local.matches[0].account.id, null)
}
