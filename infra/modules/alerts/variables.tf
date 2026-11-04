variable "name" {
  description = "Prefix for the AWS resource names."
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster whose failed deployments are reported."
  type        = string
}

variable "emails" {
  description = "Addresses that receive every alarm (each confirms its subscription once)."
  type        = list(string)
  default     = []
}

variable "slack" {
  description = "Slack channel for alarms: the workspace (team) ID and the channel ID. The workspace must be authorized once in the Amazon Q Developer console."
  type = object({
    team_id    = string
    channel_id = string
  })
  default = null
}

variable "teams" {
  description = "Microsoft Teams channel for alarms. The team must be configured once in the Amazon Q Developer console."
  type = object({
    tenant_id  = string
    team_id    = string
    channel_id = string
  })
  default = null
}

variable "monthly_budget" {
  description = "Monthly AWS bill in USD that triggers a warning when it is reached or forecast; null for no budget."
  type        = number
  default     = null
}
