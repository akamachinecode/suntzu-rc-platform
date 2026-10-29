output "deploy_role_arn" {
  description = "Value of the AWS_DEPLOY_ROLE_ARN variable in each GitHub environment."
  value       = aws_iam_role.deploy.arn
}

output "state_bucket" {
  value = local.state_bucket
}
