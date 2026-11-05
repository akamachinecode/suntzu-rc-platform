output "family" {
  description = "Task definition family: aws ecs run-task --task-definition <family> runs its latest version."
  value       = aws_ecs_task_definition.task.family
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.task.arn
}
