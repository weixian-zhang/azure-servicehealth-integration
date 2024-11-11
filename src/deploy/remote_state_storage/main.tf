locals {
  location= "Southeast Asia"
  storage_account_name = "strgsvchealthtfstate"
  resource_group_name = "rg-service-health-to-email-dev"
}


terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg_sts" {
  name     = local.resource_group_name
  location = local.location
}

resource "azurerm_storage_account" "tfstate" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.rg_sts.name
  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"
  allow_nested_items_to_be_public = false

  tags = {
    environment = "dev"
  }
}

resource "azurerm_storage_container" "tfstate_container" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}

