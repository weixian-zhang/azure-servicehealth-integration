variable "resource_group_name" {
  type=string
  default = "rg-service-health-to-email-dev"
}

variable "func_storage_account_name" {
  type = string
  default = "strgshintfuncdb1"
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
  default = "func-sh-dev-1"
}

variable "existing_log_analytics_resource_group_name" {
  type=string
  default = ""
}
variable "existing_log_analytics_name" {
  type=string
  default = ""
}

variable "smtp_config" {
  type = object({
    host = string
    port = number
    username = string
    password = string
    sender_address = string
    to_address = list(string)
    cc_address = list(string)
    bcc_address = list(string)
  })
  default = {
    host = "smtp.azurecomm.net"
    port = 587
    username = ""
    password = ""
    sender_address = "DoNotReply@674edb48-246c-4119-ac71-7eabf6c96aa5.azurecomm.net"
    to_address = ["weixzha@microsoft.com"]
    cc_address = []
    bcc_address = []
    
  }
}



