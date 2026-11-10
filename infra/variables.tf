# Each stage's values are in <stage>.tfvars.json (production.tfvars.json came with the project).

variable "hosts" {
  description = "Hostnames of this stage. SunTzu RC has no separate website: apps/app is the public site. The app and the API must share cookie_domain."
  type = object({
    app = string
    api = string
  })
}

variable "redirects" {
  description = "Hostnames that redirect to the app (for example the bare domain)."
  type        = list(string)
  default     = []
}

variable "cookie_domain" {
  description = "Parent domain of the app and the API, for the sign-in cookie."
  type        = string
}

variable "email" {
  description = "Amazon SES: the domain this stage sends from (verified with DKIM in Cloudflare; a different one per stage, inside the Cloudflare zone) and the From address."
  type = object({
    domain = string
    from   = string
    # Addresses that receive the stage's DMARC aggregate reports (rua), if any.
    dmarc_reports = optional(list(string), [])
  })
}

variable "image_tag" {
  description = "Tag of the images to run (<stage>-<commit>). Set by the deploy workflow."
  type        = string
}

variable "alerts" {
  description = "Who receives the alarms and how much is monitored (docs/OPERATIONS.md)."
  type = object({
    # At least one recipient: email addresses, a Slack channel or a Teams channel.
    emails = optional(list(string), [])
    slack = optional(object({
      team_id    = string
      channel_id = string
    }))
    teams = optional(object({
      tenant_id  = string
      team_id    = string
      channel_id = string
    }))
    # Monthly AWS bill (USD) that triggers a warning; production only.
    monthly_budget = optional(number)
    # Check the app and the API from the internet (Route 53, about $2.75 per hostname a month).
    uptime = optional(bool, true)
    # Share of new traces to keep, from 0 to 1.
    trace_sample_ratio = optional(number, 1)
  })
}
