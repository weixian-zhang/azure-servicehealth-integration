locals {
  location= "Southeast Asia"
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
  backend "azurerm" {
      resource_group_name  = "rg-service-health-to-slack-dev"
      storage_account_name = "strgsvchealthtfstate"
      container_name       = "tfstate"
      key                  = "terraform.tfstate"
  }

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

resource "azurerm_service_plan" "asp" {
  name                = var.app_service_plan_name
  resource_group_name = var.resource_group_name
  location            = local.location
  os_type             = "Linux"
  sku_name            = "B2"
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


resource "azurerm_linux_function_app" "func" {
  name                = var.function_name
  resource_group_name = var.resource_group_name
  location            = local.location

  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.asp.id

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    SERVICE_HEALTH_INTEGRATION_IS_DEVTEST = false
    SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW = 3
    HTTP_GATEWAY_URL= "https://${var.function_name}.azurewebsites.net/api/azure-incident-report/generate"
    FUNCTION_HOST_KEY = "" //try set dynamically by deployment script
    WEBSITE_TIME_ZONE= "Singapore Standard Time"
    APPLICATIONINSIGHTS_CONNECTION_STRING = "${azurerm_application_insights.appinsights.connection_string}"
    GCC_WOG_CLIENT_ID = ""
    GCC_WOG_CLIENT_SECRET = ""
    GCC_WOG_TENANT_ID = ""
    GCC_WOG_TENANT_NAME = ""
    GCC_TECHPASS_CLIENT_ID = ""
    GCC_TECHPASS_CLIENT_SECRET = ""
    GCC_TECHPASS_TENANT_ID = ""
    GCC_TECHPASS_TENANT_NAME = ""
    AzureWebJobsStorage = "${azurerm_storage_account.storage.primary_connection_string}"
    AZURE_STORAGEQUEUE_RESOURCEENDPOINT = "https://${azurerm_storage_account.storage.name}}.queue.core.windows.net"
    AZURE_STORAGETABLE_RESOURCEENDPOINT = "https://${azurerm_storage_account.storage.name}.table.core.windows.net"
    StorageQueueIdentityAuth__queueServiceUri = "https://${azurerm_storage_account.storage.name}.queue.core.windows.net/"
    SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG = "{\"host\":\"\",\"port\":,\"username\":\"\",\"password\":\"\",\"subject\":\"Azure Incident Report\",\"senderAddress\":\"\",\"recipients\":{\"to\":[],\"cc\":[],\"bcc\":[]}}"
  }

  site_config {}
}


resource "azurerm_role_assignment" "role_assign_func_table_storage" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_linux_function_app.func.identity.0.principal_id
  depends_on = [  ]
}

resource "azurerm_role_assignment" "role_assign_func_queue_storage" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.func.identity.0.principal_id
}




