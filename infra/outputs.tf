output "urls" {
  value = {
    app = "https://${var.hosts.app}"
    api = "https://${var.hosts.api}"
  }
}

output "cluster" {
  value = aws_ecs_cluster.main.name
}

# Service name => version that must be running after the deploy.
output "services" {
  value = {
    app = module.app.task_definition_arn
    api = module.api.task_definition_arn
  }
}

# What .github/workflows/task.yml needs to run a job by hand.
output "jobs" {
  value = {
    families        = { for name, job in module.job : name => job.family }
    subnets         = module.network.public_subnet_ids
    security_groups = [aws_security_group.jobs.id, module.database.client_security_group_id]
  }
}

output "snapshots_bucket" {
  value = aws_s3_bucket.snapshots.bucket
}
