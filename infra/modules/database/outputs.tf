output "url_parameter_arn" {
  description = "SSM parameter with DATABASE_URL."
  value       = aws_ssm_parameter.url.arn
}

output "client_security_group_id" {
  description = "Security group that may connect to the database."
  value       = aws_security_group.client.id
}
