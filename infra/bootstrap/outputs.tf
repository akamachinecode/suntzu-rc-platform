output "deploy_role_arn" {
  description = "Value of the AWS_DEPLOY_ROLE_ARN variable in each GitHub environment."
  value       = aws_iam_role.deploy.arn
}

output "state_bucket" {
  value = local.state_bucket
}

output "grafana_role_arn" {
  description = "Paste into 'Assume Role ARN' of Grafana's CloudWatch and Application Signals data sources."
  value       = try(aws_iam_role.grafana["on"].arn, null)
}
