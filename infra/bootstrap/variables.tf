variable "github_subject" {
  description = "OIDC subject of the repository, without the environment: repo:<org>@<org-id>/<repo>@<repo-id> (docs/AWS-GITHUB-OIDC.md, step 2)."
  type        = string
}

variable "github_environments" {
  description = "GitHub environments allowed to deploy (one per stage)."
  type        = list(string)
  default     = ["production", "staging"]
}

variable "create_oidc_provider" {
  description = "Set to false when this AWS account already has GitHub's OIDC provider."
  type        = bool
  default     = true
}

variable "deploy_policy_arn" {
  description = "Permissions of the deploy role. AdministratorAccess is fine in a dedicated account (one per client or project); in a shared account, ask Itaca engineering for a scoped policy."
  type        = string
  default     = "arn:aws:iam::aws:policy/AdministratorAccess"
}

variable "grafana_account_id" {
  description = "Grafana Cloud's AWS account, the one that assumes the Grafana role (shown in the CloudWatch data source's settings, 'Grafana Assume Role')."
  type        = string
  default     = "008923505280"
}

variable "grafana_external_id" {
  description = "External ID of our Grafana Cloud stack (alejandroelbaz.grafana.net), shown next to the account. Not a secret: it only proves which Grafana stack is asking. Empty removes the role."
  type        = string
  default     = "1160921"
}
