locals {
  project = "rc-landing"
  # Each stage (production, staging, …) is a Terraform workspace with its own <stage>.tfvars.json.
  stage         = terraform.workspace
  is_production = local.stage == "production"
  # Prefix of every AWS resource name.
  name = "${local.project}-${local.stage}"
}

resource "terraform_data" "stage" {
  lifecycle {
    precondition {
      condition     = local.stage != "default"
      error_message = "Select a stage first: terraform workspace select -or-create production (see docs/DEPLOY.md)."
    }
  }
}
