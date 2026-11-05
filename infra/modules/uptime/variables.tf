variable "name" {
  description = "Prefix for the AWS resource names."
  type        = string
}

variable "checks" {
  description = "What to check: name => public hostname and a path that answers 200 when healthy."
  type = map(object({
    host = string
    path = string
  }))
}

variable "topic" {
  description = "SNS topic in us-east-1 that receives the alarms."
  type        = string
}
