variable "name" {
  description = "Prefix for the AWS resource names."
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Private subnets, in at least two availability zones."
  type        = list(string)
}

variable "parameter_prefix" {
  description = "SSM Parameter Store path for the stage's secrets (/<project>/<stage>)."
  type        = string
}

variable "protect" {
  description = "Refuse to delete the database and keep a final snapshot (production)."
  type        = bool
}

variable "engine_version" {
  description = "PostgreSQL major version (the same as compose.yaml locally)."
  type        = string
  default     = "17"
}

variable "alarms" {
  description = "SNS topics (modules/alerts) for the database's alarms and events; null for none."
  type = object({
    critical = string
    warning  = string
  })
  default = null
}
