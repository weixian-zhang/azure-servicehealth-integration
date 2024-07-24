# Azure Service Health to Slack

### What this App does?  
* Generates HTML report and sends as email for Azure Service Health [incidents](https://learn.microsoft.com/en-us/azure/service-health/service-health-notifications-properties) and [impacted resources](https://learn.microsoft.com/en-us/azure/service-health/impacted-resources-security) for 2 Entra tenants
* fetches incidents using [Events Api - List by Subscription Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
* fetches impacted resources using [Impacted Resources - List By Subscription Id And Event Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-subscription-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
* a single incident (a.k.a service issue) can be identified uniquely by its Tracking Id.
* Each incident can contain multiple impacted services, and each impacted service can contain description for multiple regions.  
  Each region can contain multiple description and updates.  
  An real example [here](https://github.com/weixian-zhang/azure-servicehealth-integration/blob/main/src/az-servicehealth-integration/src/functions/helpers/issue-api/mock-data/sea_issues_only.json) and a high-level pseudo summary of the data hierarchy below:
&nbsp;&nbsp;<code>
&nbsp;&nbsp;&nbsp;incident/service issue with tracking id NK_29aG1
&nbsp;&nbsp;&nbsp;description: ARM provider API down
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;impacted services: Azure Relay
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;impacted region:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;South Africa North
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: azure relay down due to ARM provider impacted
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;updates:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 2
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/2 11:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 1
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/1 9:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Australia Central 2
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: azure relay down due to ARM provider impacted
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;updates:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 2
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/2 11:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 1
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/1 9:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;impacted services: Event Hub
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;impacted region:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;South Japan East
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: azure relay down due to ARM provider impacted
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;updates:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 2
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/2 10:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 1
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/1 8:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Korea Central
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: azure relay down due to ARM provider impacted
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;updates:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 2
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/2 12:22:01
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;summary: update 1
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lastUpdateTime: 2023/5/1 10:22:01</code>

<br />
<br />  

### Azure Function Configurations  
* Stack = Node.js
* Node.Js version = Node.js 18 LTA
* Platform = <b>64 Bit</b>
* Function App uses Managed Identity (or vscode sign-in identity for local dev) to authenticate against [Azure Storage Queue](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-javascript#identity-based-connections) and [Table Storage](https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-storage-table?tabs=nodejs#default-environment-variable-names-or-application-properties-and-sample-code)

### Environment Variables  
App will retrieve all Azure Subscriptions that Service Principals below have access to.

* SERVICE_HEALTH_INTEGRATION_IS_DEVTEST=false
* SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW=5 (only used when "incidentStartFromDate" querystring is not supplied to func_http_gateway)
* HTTP_GATEWAY_URL: "https://{unction name}.azurewebsites.net/api/azure-incident-report/generate?incidentStartFromDate=7/18/2024&code={function API Key},
* WEBSITE_TIME_ZONE": "Singapore Standard Time"
* APPLICATIONINSIGHTS_CONNECTION_STRING
* GCC_WOG_CLIENT_ID
* GCC_WOG_CLIENT_SECRET
* GCC_WOG_TENANT_ID
* GCC_WOG_TENANT_NAME
* GCC_TECHPASS_CLIENT_ID
* GCC_TECHPASS_CLIENT_SECRET
* GCC_TECHPASS_TENANT_ID
* GCC_TECHPASS_TENANT_NAME
* AzureWebJobsStorage: {Azure storage conection string required by Function app}
* AZURE_STORAGEQUEUE_RESOURCEENDPOINT: "https://{storage name}.queue.core.windows.net",
* AZURE_STORAGETABLE_RESOURCEENDPOINT": "https://{storage name}.table.core.windows.net",
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

### Email/Slack Message Template  

![image](https://github.com/weixian-zhang/azure-servicehealth-integration/assets/43234101/36f7f2f6-805b-442c-a549-54c11a44ee45)
