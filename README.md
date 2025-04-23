# Azure Service Health to Slack  

 <mark>Warning: Important information for customers using azure-servicehealth-integration <br />
 This solution, offered by the Open-Source community, does not receive contributions nor support by Microsoft.</mark>
 <br />  
 
* [What is Service Health to Slack](#what-is-service-health-to-slack)
* [How App Works](#how-the-app-works)
* [Service Health Issue Data Structure ](#service-health-issue-data-structure)
* [Architecture Design](#architecture-design)
* [How to Deploy](#how-to-deploy)
* [Azure Function Configurations](#azure-function-configurations)
* [Email Sample](#email-sample)

### What is Service Health to Slack?  
* Curates Azure Service Health [incidents](https://learn.microsoft.com/en-us/azure/service-health/service-health-notifications-properties) and [impacted resources](https://learn.microsoft.com/en-us/azure/service-health/impacted-resources-security) of 2 Entra tenants, generates [HTML report](https://github.com/weixian-zhang/azure-servicehealth-integration/blob/main/src/az-servicehealth-integration/doc/sample-wog-incident-report.html) and sends as email. Slack's email integration picks up email content and sends to preconfigured Slack channels.
* Other "destinations" in addition to Slack can be potentially enhanced for e.g: Enahnce app to generate impacted Azure resources as CSV email attachment

### How the App Works?
* fetches incidents using [Events Api - List by Subscription Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
* fetches impacted resources using [Impacted Resources - List By Subscription Id And Event Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-subscription-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
* Curates data from both Events API and ImpactedResources API
* Use curated data to generate HTML report.

### Service Health Issue Data Structure
Sample service issue [here](https://raw.githubusercontent.com/weixian-zhang/azure-servicehealth-integration/refs/heads/main/src/az-servicehealth-integration/src/helpers/issue-api/test-data/bak/sea_issues_only_from_rest_api_response.json), a single Event (a.k.a service issue) can be identified uniquely by its Tracking Id.

![image](https://github.com/user-attachments/assets/4144f471-3bd4-4034-943a-074224221ea2)


<br />  

### Architecture Design  
![image](https://github.com/user-attachments/assets/22666c02-7d0a-4b19-9dd9-22778ce92e16)

<br />  

### Identities & RBAC  

1. Function App Managed Identity
   - RBAC - Scope = Storage
     -  Storage Table Data Contributor
     -  Storage Queue Data Contributor
      
2. Tenant A Service Principal
   - Scope = Management Group or Subscriptions
   - Role = Reader 
      
3. Tenant B Service Principal
   - Scope = Management Group or Subscriptions
   - Role = Reader
  
4. Terraform Service Principal (optional)
   - Scope = Subcription or Resource Group
   - Role = Owner
   - [ARM_ACCESS_KEY](https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage?tabs=azure-cli#3-configure-terraform-backend-state) = { storage access key as environment variable where terraform cli is run }

### How to Deploy  
* deploy Function App only:
  * change resource group and Function anme in this Python script
  * executes scri[t "python src/deploy/main_app/deploy_func_app.py"
* deploy all Azure resources and Function app:
  * Run a [single Terraform file](https://github.com/weixian-zhang/azure-servicehealth-integration/blob/main/src/deploy/main_app/main.tf) (from [directory](https://github.com/weixian-zhang/azure-servicehealth-integration/tree/main/src/deploy/main_app)) to create all needed Azure resources plus, Function app deployment

<br />  

### Azure Function Configurations  
* Stack = Node.js
* Node.Js version = Node.js 18 LTA
* Platform = <b>64 Bit</b>
* Function App uses Managed Identity (or vscode sign-in identity for local dev) to authenticate against [Azure Storage Queue](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-javascript#identity-based-connections) and [Table Storage](https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-storage-table?tabs=nodejs#default-environment-variable-names-or-application-properties-and-sample-code)

<br />  

### Environment Variables  
App will retrieve all Azure Subscriptions that Service Principals below have access to.

* <b>HTTP_GATEWAY_FUNC_HOST_KEY_USED_BY_TIMER_FUNC= {on post-provision, manually set func gateway host key here (used by timer function) } </b>
* SERVICE_HEALTH_INTEGRATION_IS_DEVTEST=false
* SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW=5 (only used when "incidentStartFromDate" querystring is not supplied to func_http_gateway)
* HTTP_GATEWAY_URL: "https://{unction name}.azurewebsites.net/api/azure-incident-report/generate?incidentStartFromDate=7/18/2024&code={function API Key},
* WEBSITE_TIME_ZONE": "Singapore Standard Time"
* APPLICATIONINSIGHTS_CONNECTION_STRING
* GCC_TECHPASS_CLIENT_ID
* GCC_TECHPASS_CLIENT_SECRET
* GCC_TECHPASS_TENANT_ID
* AzureWebJobsStorage: {Azure storage conection string required by Function app}
* AZURE_STORAGE_NAME
* StorageQueueIdentityAuth__queueServiceUri": "https://{storage name}.queue.core.windows.net/",
* SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG (email config in Json format)
  e.g:
  example uses [Azure Communication Services SMTP](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email-smtp/smtp-authentication)  
  <code>
      {
          &nbsp;"host": "smtp.azurecomm.net",
          &nbsp;"port": 587,
          &nbsp;"username": "{Azure comm service name}.{Entra app client id}.{Entra tenant id}",
          &nbsp;"password": "{Entra app client secret}",
          &nbsp;"subject": "Azure Incident Report",
          &nbsp;"senderAddress": "{from/sender email address}",
          &nbsp;"recipients": {
            &nbsp;&nbsp;&nbsp;&nbsp;"to": ["weixzha@microsoft.com"],
            &nbsp;&nbsp;&nbsp;&nbsp;"cc": [],
            &nbsp;&nbsp;&nbsp;&nbsp;"bcc": []
          &nbsp;&nbsp;}
      }
    </code>   

### Email Sample  

![image](https://github.com/user-attachments/assets/b2f41102-d59e-4bcf-bdde-eb036c05df28)


