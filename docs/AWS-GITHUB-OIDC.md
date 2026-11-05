# AWS access for GitHub Actions (OIDC)

The deploy workflow gets **short-lived AWS credentials** from an IAM role through GitHub's OIDC provider. No AWS access keys are stored in GitHub or anywhere else.

Recommended: give each client/project its own AWS account (AWS Organizations). The deploy role can then be broad inside that account without being able to touch anything else.

## 1. OIDC provider (once per AWS account)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

## 2. The repository's OIDC subject

The deploy job runs in the GitHub environment `production`, so its token subject ends in `:environment:production`. Repositories created (or renamed/transferred) after 2026-07-15 include immutable owner and repository IDs:

```bash
OWNER_ID=$(gh api users/akamachinecode --jq .id)
REPO_ID=$(gh api repos/akamachinecode/rc-landing --jq .id)
echo "repo:akamachinecode@${OWNER_ID}/rc-landing@${REPO_ID}:environment:production"
```

Older repositories that haven't opted in use `repo:akamachinecode/rc-landing:environment:production`.

## 3. Deploy role

Save as `trust-policy.json`, replacing `<ACCOUNT_ID>` and `<SUBJECT>` (output of step 2):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "<SUBJECT>"
        }
      }
    }
  ]
}
```

```bash
aws iam create-role \
  --role-name rc-landing-github-deploy \
  --assume-role-policy-document file://trust-policy.json
```

Then grant it `AdministratorAccess` in a dedicated account (one per client or project); in a shared account, ask Itaca engineering for a scoped policy. `infra/bootstrap` does steps 1, 3 and 4 for you: see [`TERRAFORM.md`](./TERRAFORM.md).

## 4. Tell GitHub which role to use

```bash
gh api -X PUT repos/akamachinecode/rc-landing/environments/production
gh variable set AWS_DEPLOY_ROLE_ARN --env production \
  --body "arn:aws:iam::<ACCOUNT_ID>:role/rc-landing-github-deploy"
```

Optional: in **Settings → Environments → production**, add required reviewers so every production deploy needs an approval.
