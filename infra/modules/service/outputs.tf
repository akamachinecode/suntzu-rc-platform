output "task_definition_arn" {
  description = "Version the deploy workflow expects to be running after the rollout."
  value       = aws_ecs_task_definition.service.arn
}

output "task_role_name" {
  description = "Role of the running code: attach the AWS permissions it needs here."
  value       = aws_iam_role.task.name
}
