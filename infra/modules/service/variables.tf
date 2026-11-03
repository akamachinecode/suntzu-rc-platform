variable "name" {
  description = "Prefix for the AWS resource names."
  type        = string
}

variable "service" {
  description = "Short name of the service (app, api)."
  type        = string
}

variable "cluster_arn" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Public subnets for the containers."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Extra security groups for the containers (for example the database's client group)."
  type        = list(string)
  default     = []
}

variable "listener_arn" {
  description = "HTTPS listener of the load balancer."
  type        = string
}

variable "alb_security_group_id" {
  type = string
}

variable "host" {
  description = "Hostname this service answers."
  type        = string
}

variable "priority" {
  description = "Priority of the load balancer rule (unique per load balancer)."
  type        = number
}

variable "origin_lock" {
  description = "Require Cloudflare's secret header."
  type        = bool
}

variable "origin_verify_header" {
  description = "Secret header value Cloudflare adds to every request, or \"off\"."
  type        = string
  sensitive   = true
}

variable "image" {
  description = "Container image, with its tag."
  type        = string
}

variable "port" {
  description = "Port the container listens on."
  type        = number
}

variable "health_check_path" {
  description = "Path that answers 200 when the container is ready."
  type        = string
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
