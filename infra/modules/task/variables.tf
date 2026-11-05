variable "name" {
  description = "Prefix for the AWS resource names."
  type        = string
}

variable "task" {
  description = "Short name of the task (engine, notify…)."
  type        = string
}

variable "cluster_arn" {
  type = string
}

variable "subnet_ids" {
  description = "Public subnets for the container (it gets a public IP to reach the internet; nothing can connect to it)."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups of the container (for example the database's client group)."
  type        = list(string)
}

variable "image" {
  description = "Container image, with its tag."
  type        = string
}

variable "command" {
  description = "Command the container runs."
  type        = list(string)
}

variable "schedule" {
  description = "EventBridge Scheduler expression, such as cron(15 * * * ? *), or null to run it by hand only."
  type        = string
  default     = null
}

variable "timezone" {
  description = "Time zone of the schedule."
  type        = string
  default     = "UTC"
}

variable "cpu" {
  description = "CPU units (1024 = 1 vCPU)."
  type        = number
}

variable "memory" {
  description = "Memory in MiB."
  type        = number
}

variable "environment" {
  description = "Plain environment variables."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret environment variables: name => SSM SecureString parameter (its name or ARN)."
  type        = map(string)
  default     = {}
}

variable "policy_arns" {
  description = "IAM policies with the code's own AWS permissions."
  type        = list(string)
  default     = []
}
