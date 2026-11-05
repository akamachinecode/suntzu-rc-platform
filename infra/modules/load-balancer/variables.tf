variable "name" {
  description = "Prefix for the AWS resource names."
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "subnet_ids" {
  description = "Public subnets, in at least two availability zones."
  type        = list(string)
}

variable "hosts" {
  description = "Hostnames served by the containers behind this load balancer."
  type        = list(string)
}

variable "zone_id" {
  description = "Cloudflare zone of the hostnames."
  type        = string
}

variable "protect" {
  description = "Refuse to delete the load balancer (production)."
  type        = bool
}

variable "alarms" {
  description = "SNS topic (modules/alerts) for the load balancer's alarm; null for none."
  type = object({
    critical = string
  })
  default = null
}
