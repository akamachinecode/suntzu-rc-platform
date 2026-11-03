# Each stage's values are in <stage>.tfvars.json (production.tfvars.json came with the project).

variable "hosts" {
  description = "Hostnames of this stage. Servo has no separate website: apps/app is the public site. The app and the API must share cookie_domain."
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
  })
}

variable "image_tag" {
  description = "Tag of the images to run (<stage>-<commit>). Set by the deploy workflow."
  type        = string
}
