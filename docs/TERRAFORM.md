# Infrastructure as code (Terraform)

Everything this project runs on in AWS and Cloudflare is described in [`infra/`](../infra) with Terraform (it also runs on OpenTofu). How it deploys is in [`DEPLOY.md`](./DEPLOY.md).

| Path                        | What it is                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `infra/*.tf`                | The stack. CI applies it on every deploy. `main.tf` (app, API, database), `jobs.tf`, `email.tf`, `storage.tf`, `permissions.tf` and `secrets.tf` |
| `infra/<stage>.tfvars.json` | One file per stage with its hostnames and email domain. `production` and `staging` come with the project.                                        |
| `infra/modules/`            | Local modules used by the stack (`task` is Servo's own, for the scheduled jobs). No modules are downloaded from a registry.                      |
| `infra/bootstrap/`          | One-time setup of the AWS account, run by an admin.                                                                                              |
| `infra/.terraform.lock.hcl` | Checksums of the providers, so every machine runs the same code. Committed.                                                                      |

- **Every change shows its plan first:** exactly what will be created, changed or deleted. The deploy workflow writes it in the run's summary; pull requests that change `infra/` are checked by [`.github/workflows/infra.yml`](../.github/workflows/infra.yml) (format and validation, no AWS access).
- **State** (what Terraform created) lives in the S3 bucket `rc-landing-tfstate-<account-id>`: versioned, encrypted and private. It holds the secrets Terraform generates, so access to it is access to them.
- **Stages** (production, staging, …) are Terraform workspaces, each with its own state, resources and `infra/<stage>.tfvars.json`.

## One-time setup of the AWS account

You need the AWS CLI signed in with an admin profile (`aws sso login --profile <profile> && export AWS_PROFILE=<profile>`), [Terraform](https://developer.hashicorp.com/terraform/install) 1.16 or newer, and `gh`.

### 1. State bucket

```bash
BUCKET=rc-landing-tfstate-$(aws sts get-caller-identity --query Account --output text)
aws s3 mb "s3://$BUCKET" --region us-east-2
```

### 2. Deploy role and container registries

`infra/bootstrap` creates GitHub's OIDC provider, the deploy role and the container registries, and secures the state bucket. It replaces steps 1, 3 and 4 of [`AWS-GITHUB-OIDC.md`](./AWS-GITHUB-OIDC.md); use step 2 of that guide to find the repository's subject (without `:environment:production`).

```bash
terraform -chdir=infra/bootstrap init -backend-config="bucket=$BUCKET"
terraform -chdir=infra/bootstrap apply -var 'github_subject=repo:akamachinecode@<owner-id>/rc-landing@<repo-id>'
```

- If the account already has GitHub's OIDC provider, add `-var create_oidc_provider=false`.
- The deploy role gets `AdministratorAccess`, which is fine in a dedicated account (one per client or project). In a shared account, ask Itaca engineering for a scoped policy and pass `-var deploy_policy_arn=<arn>`.

Then continue with the Cloudflare and GitHub steps in [`DEPLOY.md`](./DEPLOY.md).

## Adding a stage

`staging` is ready (`infra/staging.tfvars.json`); for another one:

1. Copy `infra/staging.tfvars.json` to `infra/<stage>.tfvars.json` and change the hostnames and the email domain (each stage sends from its own, such as `<stage>.example.com`). Use first-level subdomains such as `www-<stage>.example.com`: Cloudflare's free certificate doesn't cover deeper levels.
2. Add the stage to the `options` of `.github/workflows/deploy.yml` and `task.yml`, and to `github_environments` in `infra/bootstrap` (then apply it again).
3. Create the GitHub environment with the same variables and secrets as `production`, and the stage's optional settings ([`DEPLOY.md`](./DEPLOY.md)).
4. Commit, then run **Actions → Deploy → Run workflow** with the new stage, and **Actions → Run a task** with `setup`.

To delete a stage you no longer use: `terraform workspace select staging && terraform destroy -var-file=staging.tfvars.json` (from `infra/`, set up as below). Production refuses to be deleted.

## Running Terraform from your machine

To preview a change before merging it:

```bash
export CLOUDFLARE_API_TOKEN=<token>
cd infra
terraform init -backend-config="bucket=rc-landing-tfstate-$(aws sts get-caller-identity --query Account --output text)"
terraform workspace select production
terraform plan -var-file=production.tfvars.json
```

If it asks for `image_tag`, pass the tag currently deployed (`-var image_tag=production-<commit>`): the deploy workflow sets it.

Don't `apply` production from a laptop except in an emergency — the workflow is the source of truth. After editing `infra/`, run `terraform fmt -recursive` and `terraform validate`.

## Upgrading Terraform and providers

Dependabot opens pull requests for provider updates in `infra/` and `infra/bootstrap/` (never versions younger than 7 days) and updates `.terraform.lock.hcl`. Read the provider's changelog, merge, and check the plan in the Deploy run's summary. To upgrade Terraform itself, change `terraform_version` in the workflows.
