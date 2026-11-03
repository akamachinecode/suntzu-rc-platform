# Secrets live in SSM Parameter Store under /<project>/<stage>/ (docs/DEPLOY.md). Containers read
# them when they start, so they never appear in the code, the images or the task definitions.

locals {
  parameter_prefix = "/${local.project}/${local.stage}"

  # Optional secrets: each one turns a feature on once it exists, and stays out until then.
  #   aws ssm put-parameter --type SecureString --name /rc-landing/<stage>/<name> --value '<value>'
  # then deploy. Their values never pass through Terraform.
  optional_secrets = {
    # Comma-separated emails: those accounts get the crew role.
    CREW_EMAILS = "crew-emails"
    # Where the crew hears about new messages and "try it" requests.
    CREW_INBOX = "crew-inbox"
    # "Continue with Google": both, plus google-client-id turns the button on (deploy.yml).
    GOOGLE_CLIENT_ID     = "google-client-id"
    GOOGLE_CLIENT_SECRET = "google-client-secret"
    # Cloudflare Turnstile on public forms (its public site key is turnstile-site-key, deploy.yml).
    TURNSTILE_SECRET_KEY = "turnstile-secret-key"
  }

  api_secrets = merge(
    {
      DATABASE_URL       = module.database.url_parameter_arn
      BETTER_AUTH_SECRET = aws_ssm_parameter.auth_secret.arn
    },
    {
      for variable, name in local.optional_secrets : variable => "${local.parameter_prefix}/${name}"
      if contains(data.aws_ssm_parameters_by_path.stage.names, "${local.parameter_prefix}/${name}")
    },
  )
}

# Which parameters this stage has (names only: values stay encrypted).
data "aws_ssm_parameters_by_path" "stage" {
  path            = local.parameter_prefix
  with_decryption = false
}

# Better Auth's signing secret, generated once per stage.
resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "auth_secret" {
  name  = "${local.parameter_prefix}/better-auth-secret"
  type  = "SecureString"
  value = random_password.auth_secret.result
}
