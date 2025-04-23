locals {
  location= "Southeast Asia"
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4.0"
    }
    azapi = {
      source = "Azure/azapi"
    }
  }
  # backend "azurerm" {
  #     resource_group_name  = "rg-service-health-to-email"
  #     storage_account_name = "strgsvchealth1"
  #     container_name       = "tfstate"
  #     key                  = "terraform.tfstate"
  # }
}

provider "azapi" {
}

provider "azurerm" {
  features {}
}

data "azurerm_subscription" "primary" { }

# data "azurerm_storage_account" "func_storage" {
#   name                = var.func_storage_account_name
#   resource_group_name = var.resource_group_name
# }
resource "azurerm_storage_account" "func_storage" {
  name                     = var.func_storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"
}

resource "azurerm_storage_queue" "incident_in_queue" {
  name                 = var.storage_queue_name
  storage_account_name = azurerm_storage_account.func_storage.name #var.func_storage_account_name
}

resource "azurerm_storage_table" "db_table" {
  name                 = var.storage_table_name
  storage_account_name = azurerm_storage_account.func_storage.name #var.func_storage_account_name
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
  sku_name = "S1"
  # sku_name            = "P1v2"
  # zone_balancing_enabled = true
  # per_site_scaling_enabled = true
  worker_count = 1
}

//* managed identity assigned to management group
resource "azurerm_windows_function_app" "func" {
  name                = var.function_name
  resource_group_name = var.resource_group_name
  location            = local.location
  https_only                 = true
  storage_account_name       = var.func_storage_account_name
  storage_account_access_key = azurerm_storage_account.func_storage.primary_access_key #data.azurerm_storage_account.func_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.asp.id
  

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    HTTP_GATEWAY_FUNC_HOST_KEY_USED_BY_TIMER_FUNC = "{http gateway func host key manually set}"
    # GCC_WOG_CLIENT_ID = " {manually set} "
    # GCC_WOG_CLIENT_SECRET = " {manually set} "
    # GCC_WOG_TENANT_ID = " {manually set} "
    # GCC_WOG_TENANT_NAME = "WOG"
    GCC_TECHPASS_CLIENT_ID = " {manually set} "
    GCC_TECHPASS_CLIENT_SECRET = " {manually set} "
    GCC_TECHPASS_TENANT_ID = " {manually set} "
    SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG = "{\"host\":\"manually set\",\"port\":25,\"username\":\"manually set\",\"password\":\"manually set\",\"subject\":\"Azure Incident Report\",\"senderAddress\":\"manually set\",\"recipients\":{\"to\": [],\"cc\": [],\"bcc\":[] }}"
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR = true
    WEBSITE_RUN_FROM_PACKAGE = 0
    SCM_DO_BUILD_DURING_DEPLOYMENT = true
    AzureWebJobsFeatureFlags = "EnableWorkerIndexing"
    FUNCTIONS_WORKER_RUNTIME = "node"
    SERVICE_HEALTH_INTEGRATION_IS_DEVTEST = false
    SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW = 3
    HTTP_GATEWAY_URL= "https://${var.function_name}.azurewebsites.net/api/azure-incident-report/generate"
    HTTP_GATEWAY_FUNC_HOST_KEY_USED_BY_TIMER_FUNC = "" // manually set on function post creation
    WEBSITE_TIME_ZONE= "Singapore Standard Time"
    APPLICATIONINSIGHTS_CONNECTION_STRING = "${azurerm_application_insights.appinsights.connection_string}"
    AzureWebJobsStorage =  "${ azurerm_storage_account.func_storage.primary_connection_string}" #"${ data.azurerm_storage_account.func_storage.primary_connection_string}"
    AZURE_STORAGE_NAME = "${var.func_storage_account_name}"
    # AZURE_STORAGEQUEUE_RESOURCEENDPOINT = "https://${var.func_storage_account_name}.queue.core.windows.net"
    # AZURE_STORAGETABLE_RESOURCEENDPOINT = "https://${var.func_storage_account_name}.table.core.windows.net"
  }

  site_config {
    always_on = true
    application_stack {
      node_version = "~22"
      
    }
  }
}

resource "azurerm_role_assignment" "storage_blob_data_contributor" {
  scope                = azurerm_storage_account.func_storage.id #data.azurerm_storage_account.func_storage.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_windows_function_app.func.identity.0.principal_id
}


resource "azurerm_role_assignment" "storage_table_data_contributor" {
  scope                = azurerm_storage_account.func_storage.id #data.azurerm_storage_account.func_storage.id
  role_definition_name = "Storage Table Data Contributor" # join("/", ["/subscription", data.azurerm_subscription.primary.subscription_id, "providers/Microsoft.Authorization/roleDefinitions/0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3"])
  principal_id         = azurerm_windows_function_app.func.identity.0.principal_id
}

resource "azurerm_role_assignment" "storage_queue_data_contributor" {
  scope                = azurerm_storage_account.func_storage.id #data.azurerm_storage_account.func_storage.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_windows_function_app.func.identity.0.principal_id
}

resource "null_resource" "execute_python_deployment_script" {
  triggers = {
    always_run = "${timestamp()}"
  }
  provisioner "local-exec" {
    command = "python deploy_func_app.py ${var.resource_group_name} ${var.function_name}"
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
#         HTTP_GATEWAY_FUNC_HOST_KEY_USED_BY_TIMER_FUNC = "${null_resource.func_host_key}"
#       }
#     }
#   })
#   depends_on = [ null_resource.func_host_key ]
# }



