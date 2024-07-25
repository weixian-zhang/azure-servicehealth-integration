variable "resource_group_name" {
  type=string
  default = "rg-service-health-to-slack-dev"
}

variable "storage_queue_name" {
  type=string
  default = "incident-fetcher-in"
}

variable "storage_table_name" {
  type=string
  default = "Issue"
}

variable "app_service_plan_name" {
  type=string
  default = "asp-sh-basic"
}

variable "function_name" {
  type=string
  default = "func-sh-dev"
}



