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
  name                     = "linuxfunctionappsa"
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
  storage_account_name = azurerm_storage_account.example.name
}

resource "azurerm_service_plan" "asp" {
  name                = var.app_service_plan_name
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  os_type             = "Linux"
  sku_name            = "B2"
}

resource "azurerm_linux_function_app" "func" {
  name                = var.function_name
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location

  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.asp.id

  app_settings = {
    SERVICE_HEALTH_INTEGRATION_IS_DEVTEST = false
    SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW = 5
    HTTP_GATEWAY_URL= "https://${azurerm_linux_function_app.func.name}.azurewebsites.net/api/azure-incident-report/generate?incidentStartFromDate=7/18/2024&code={function API Key}"
    WEBSITE_TIME_ZONE= "Singapore Standard Time"
    APPLICATIONINSIGHTS_CONNECTION_STRING = ""
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
    SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG = "{\"host\":\"smtp.azurecomm.net\",\"port\":,\"username\":\"\",\"password\":\"\",\"subject\":\"Azure Incident Report\",\"senderAddress\":\"\",\"recipients\":{\"to\":[],\"cc\":[],\"bcc\":[]}}"
  }

  site_config {}
}