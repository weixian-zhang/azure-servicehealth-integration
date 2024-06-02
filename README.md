# azure-servicehealth-integration

### What this App does?  
* Fetches Azure Service Health [incidents](https://learn.microsoft.com/en-us/azure/service-health/service-health-notifications-properties) and [impacted resources](https://learn.microsoft.com/en-us/azure/service-health/impacted-resources-security) for 2 separate Entra tenants
* fetches incidents using [Events Api - List by Subscription Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
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
* platform = <b>64 Bit</b>

### Environment Variables
* AZURE_STORAGE_QUEUE_CONNECTION_STRING
* APPLICATIONINSIGHTS_CONNECTION_STRING
* GCC_WOG_CLIENT_ID
* GCC_WOG_CLIENT_SECRET
* GCC_WOG_TENANT_ID
* GCC_WOG_TENANT_NAME
* GCC_TECHPASS_CLIENT_ID
* GCC_TECHPASS_CLIENT_SECRET
* GCC_TECHPASS_TENANT_ID
* GCC_TECHPASS_TENANT_NAME
* AZURE_STORAGE_CONNECTION_STRING (AZure Function required storage account)
* AZURE_COMM_SERVICE_CONN_STRING (using Azure Communication Service - email for local testing only)
* SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG (email config in Json format)
  e.g:
  <code>
      {
          &nbsp;"host": "",
          &nbsp;"port": 587,
          &nbsp;"username": "",
          &nbsp;"password": "",
          &nbsp;"subject": "Azure Incident Report",
          &nbsp;"senderAddress": "674edb48-246c-4119-ac71-7eabf6c96aa5.azurecomm.net",
          &nbsp;"recipients": {
            &nbsp;&nbsp;&nbsp;&nbsp;"to": ["weixzha@microsoft.com"],
            &nbsp;&nbsp;&nbsp;&nbsp;"cc": [],
            &nbsp;&nbsp;&nbsp;&nbsp;"bcc": []
          &nbsp;&nbsp;}
      }
    </code>   

### Email/Slack Message Template  

![image](https://github.com/weixian-zhang/azure-servicehealth-integration/assets/43234101/36f7f2f6-805b-442c-a549-54c11a44ee45)
