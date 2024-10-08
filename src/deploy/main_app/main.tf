locals {
  location= "Southeast Asia"
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
    azapi = {
      source = "Azure/azapi"
    }
  }
  backend "azurerm" {
      resource_group_name  = "rg-service-health-to-slack-dev"
      storage_account_name = "strgsvchealthtfstate"
      container_name       = "tfstate"
      key                  = "terraform.tfstate"
  }
}

provider "azapi" {
}

provider "azurerm" {
  features {}
}


resource "azurerm_storage_account" "storage" {
  name                     = "strgshintfuncdb"
  resource_group_name      = var.resource_group_name
  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"
}

resource "azurerm_storage_queue" "incident_in_queue" {
  name                 = var.storage_queue_name
  storage_account_name = azurerm_storage_account.storage.name
}

resource "azurerm_storage_table" "db_table" {
  name                 = var.storage_table_name
  storage_account_name = azurerm_storage_account.storage.name
}

# get log analytics workspace id that backs app insights
data "azurerm_log_analytics_workspace" "law" {
  name                = var.existing_log_analytics_name
  resource_group_name = var.existing_log_analytics_resource_group_name
}

resource "azurerm_application_insights" "appinsights" {
  name                = "appinsights-${var.function_name}"
  location            = local.location
  resource_group_name = var.resource_group_name
  workspace_id        = data.azurerm_log_analytics_workspace.law.id
  application_type    = "web"
}


resource "azurerm_service_plan" "asp" {
  name                = var.app_service_plan_name
  resource_group_name = var.resource_group_name
  location            = local.location
  os_type             = "Windows"
  sku_name            = "B2"
}

resource "azurerm_windows_function_app" "func" {
  name                = var.function_name
  resource_group_name = var.resource_group_name
  location            = local.location
  https_only                 = true
  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.asp.id

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR = true
    WEBSITE_RUN_FROM_PACKAGE = 0
    SCM_DO_BUILD_DURING_DEPLOYMENT = true
    FUNCTIONS_WORKER_RUNTIME = "node"
    SERVICE_HEALTH_INTEGRATION_IS_DEVTEST = false
    SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW = 3
    HTTP_GATEWAY_URL= "https://${var.function_name}.azurewebsites.net/api/azure-incident-report/generate"
    FUNCTION_HOST_KEY = "" // manually set on function post creation
    WEBSITE_TIME_ZONE= "Singapore Standard Time"
    APPLICATIONINSIGHTS_CONNECTION_STRING = "${azurerm_application_insights.appinsights.connection_string}"
    GCC_WOG_CLIENT_ID = ""
    GCC_WOG_CLIENT_SECRET = ""
    GCC_WOG_TENANT_ID = ""
    GCC_WOG_TENANT_NAME = "WOG"
    GCC_TECHPASS_CLIENT_ID = ""
    GCC_TECHPASS_CLIENT_SECRET = ""
    GCC_TECHPASS_TENANT_ID = ""
    GCC_TECHPASS_TENANT_NAME = "TechPass"
    AzureWebJobsStorage = "${azurerm_storage_account.storage.primary_connection_string}"
    AZURE_STORAGEQUEUE_RESOURCEENDPOINT = "https://${azurerm_storage_account.storage.name}}.queue.core.windows.net"
    AZURE_STORAGETABLE_RESOURCEENDPOINT = "https://${azurerm_storage_account.storage.name}.table.core.windows.net"
    StorageQueueIdentityAuth__queueServiceUri = "https://${azurerm_storage_account.storage.name}.queue.core.windows.net/"
    SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG = "{\"host\":\"${var.smtp_config.host}\",\"port\":${var.smtp_config.port},\"username\":\"${var.smtp_config.username}\",\"password\":\"${var.smtp_config.password}\",\"subject\":\"Azure Incident Report\",\"senderAddress\":\"${var.smtp_config.sender_address}\",\"recipients\":{\"to\":${jsonencode(var.smtp_config.to_address)},\"cc\":${jsonencode(var.smtp_config.cc_address)},\"bcc\":${jsonencode(var.smtp_config.bcc_address)}}}"
  }

  site_config {
    always_on = true
    application_stack {
      node_version = "~18"
      
    }
  }
}


resource "azurerm_role_assignment" "role_assign_func_table_storage" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_windows_function_app.func.identity.0.principal_id
  depends_on = [  ]
}

resource "azurerm_role_assignment" "role_assign_func_queue_storage" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_windows_function_app.func.identity.0.principal_id
}


resource "null_resource" "execute_python_deployment_script" {
  triggers = {
    always_run = "${timestamp()}"
  }
  provisioner "local-exec" {
    command = "python deploy_func_app.py"
    working_dir = "${path.module}"
  }
  
  depends_on = [ azurerm_windows_function_app.func ]
  
}

# below implementation: try get func host key from data and local-exec but not successful.
# A proven way is to redirect local-exec key value to a file, may have security concern saving API key on file
# resource "null_resource" "func_host_key" {
#   triggers  =  { always_run = "${timestamp()}" }
#    provisioner "local-exec" {
#       command = "az functionapp keys list -n func-sh-dev -g rg-service-health-to-slack-dev --query 'functionKeys.default'"
#       interpreter = ["PowerShell"]
#     }
# }

# data "azurerm_function_app_host_keys" "func_host_key" {
#   name                = azurerm_windows_function_app.func.name
#   resource_group_name = var.resource_group_name
#   depends_on = [ azurerm_windows_function_app.func ]
# }
#az functionapp keys list -n func-sh-dev -g rg-service-health-to-slack-dev --query 'functionKeys.default'


# update function host key needed by func_timer_http_client to call func_http_gateway
# resource "azapi_update_resource" "azapi_func_app_settings" {
#   type = "Microsoft.Web/sites@2022-03-01"
#   resource_id = azurerm_windows_function_app.func.id
#   body = jsonencode({
#     properties = {
#       app_settings = {
#         FUNCTION_HOST_KEY = "${null_resource.func_host_key}"
#       }
#     }
#   })
#   depends_on = [ null_resource.func_host_key ]
# }



