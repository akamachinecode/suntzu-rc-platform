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
