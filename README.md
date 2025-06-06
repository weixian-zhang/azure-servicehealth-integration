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
* [HTML Formatted Email Report Sample](#html-formatted-email-report-sample)
* [Slack Markdown Formatted Report Sample](#slack-markdown-formatted-report-sample)

### What is Service Health to Slack?  
* Curates Azure Service Health [incidents](https://learn.microsoft.com/en-us/azure/service-health/service-health-notifications-properties) and [impacted resources](https://learn.microsoft.com/en-us/azure/service-health/impacted-resources-security), generates [Slack markdown](#slack-markdown-formatted-report-sample) or [HTML format](https://github.com/weixian-zhang/azure-servicehealth-integration/blob/main/src/az-servicehealth-integration/doc/sample-wog-incident-report.html) and sends as email.
* Slack's email integration picks up email content and sends to preconfigured Slack channels

### How the App Works?
* fetches incidents using [Events Api - List by Subscription Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
* fetches impacted resources using [Impacted Resources - List By Subscription Id And Event Id](https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-subscription-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP)
* Curates issue data from both Events API and ImpactedResources API
* Tracks received issues to prevent from sending duplicate report
* Generated Slack markdown formatted report or HTML formated report

### Service Health Issue Data Structure
Sample service issue [here](https://raw.githubusercontent.com/weixian-zhang/azure-servicehealth-integration/refs/heads/main/src/az-servicehealth-integration/src/helpers/issue-api/test-data/bak/sea_issues_only_from_rest_api_response.json), a single Event (a.k.a service issue) can be identified uniquely by its Tracking Id.

![image](https://github.com/user-attachments/assets/9b77cb11-87c0-47e5-8a82-55759892600f)


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

### HTML formatted Email Report Sample  

![image](https://github.com/user-attachments/assets/b2f41102-d59e-4bcf-bdde-eb036c05df28)  

### Slack Markdown formatted Report Sample

*Azure Incident Report* 

- Title: Active - Azure Virtual Desktop reduction in the diagnostic data
- Affected Services: Windows Virtual Desktop, Azure Relay, Azure Kubernetes Service
- Status: Active
- Subscriptions Impacted: **4**
- Impact Start Time: 2024-09-17T18:36:24.113Z
- Impact Mitigation Time: 2024-10-20T21:41:37.000Z 

*Impacted Resources*


*Windows Virtual Desktop*
- Status: Active
- Last Updated At: October 29, 2024 at 7:50 AM


- October 29, 2024 at 7:50 AM: ```Impact Statement: Starting at 18:46 UTC on 16 Sep 2024, customers using Azure Virtual Desktop may notice a reduction in the
diagnostic data we collect. This is a temporary adjustment aimed at stabilizing our backend databases as part of our ongoing
investigation into the issues stemming from incident 1LG8-1X0.

 

Current status: The decision to reduce diagnostics collection is a precaution to avoid a recurrence of the challenges we faced
during that incident. One of the triggers of the incident was traced to an overload of data being written to database replicas,
which triggered delays, automatic failovers, and ultimately led to a database outage. By temporarily limiting the amount of
diagnostic data captured, we are reducing the load on the databases and mitigating potential replication issues, thus improving
service stability.

 

This is a temporary solution until we roll out a permanent fix.

 

The diagnostics that we will no longer be ingesting are exclusive to "Feed and management diagnostics". One of the triggers of the
incident was a degradation in the speed at which data was written to database replicas, which triggered delays, automatic
failovers, and ultimately led to a database outage.

 

We are still working on the long term fix, and will provide a status update on its development by November 15, 2024, or sooner as
events warrant. ```


- October 22, 2024 at 2:20 AM: ```We previously reported this issue as mitigated, however, on further inspection we can confirm that the issue is still active and
being investigated. We apologize for the inconvenience.




Impact Statement: Starting at 18:46 UTC on 16 Sep 2024, customers using Azure Virtual Desktop may notice a reduction in the
diagnostic data we collect. This is a temporary adjustment aimed at stabilizing our backend databases as part of our ongoing
investigation into the issues stemming from incident 1LG8-1X0.

 

Current status: The decision to reduce diagnostics collection is a precaution to avoid a recurrence of the challenges we faced
during that incident. One of the triggers of the incident was traced to an overload of data being written to database replicas,
which triggered delays, automatic failovers, and ultimately led to a database outage. By temporarily limiting the amount of
diagnostic data captured, we are reducing the load on the databases and mitigating potential replication issues, thus improving
service stability.

 

This is a temporary solution until we roll out a permanent fix.

 

The diagnostics that we will no longer be ingesting are exclusive to "Feed and management diagnostics". One of the triggers of the
incident was a degradation in the speed at which data was written to database replicas, which triggered delays, automatic
failovers, and ultimately led to a database outage. We are working on a fix and a rollout. We will provide an update by 28 October
2024. ```


- October 21, 2024 at 5:46 AM: ```What happened?

Between 18:46 UTC on 16 Sep 2024, and 21:43 UTC on 20 October 2024, customers using Azure Virtual Desktop may have noticed a
reduction in the diagnostic data we collect. This was a temporary adjustment aimed at stabilizing our backend databases as part of
our previously ongoing investigation into the issues stemming from incident 1LG8-1X0.




Current Status: This incident has been mitigated. More information will be provided shortly.```



*Azure Relay*
- Status: Active
- Last Updated At: October 29, 2024 at 7:50 AM


- October 29, 2024 at 7:50 AM: ```Impact Statement: Starting at 18:46 UTC on 16 Sep 2024, customers using Azure Virtual Desktop may notice a reduction in the
diagnostic data we collect. This is a temporary adjustment aimed at stabilizing our backend databases as part of our ongoing
investigation into the issues stemming from incident 1LG8-1X0.

 

Current status: The decision to reduce diagnostics collection is a precaution to avoid a recurrence of the challenges we faced
during that incident. One of the triggers of the incident was traced to an overload of data being written to database replicas,
which triggered delays, automatic failovers, and ultimately led to a database outage. By temporarily limiting the amount of
diagnostic data captured, we are reducing the load on the databases and mitigating potential replication issues, thus improving
service stability.

 

This is a temporary solution until we roll out a permanent fix.

 

The diagnostics that we will no longer be ingesting are exclusive to "Feed and management diagnostics". One of the triggers of the
incident was a degradation in the speed at which data was written to database replicas, which triggered delays, automatic
failovers, and ultimately led to a database outage.

 

We are still working on the long term fix, and will provide a status update on its development by November 15, 2024, or sooner as
events warrant. ```


- October 22, 2024 at 2:20 AM: ```We previously reported this issue as mitigated, however, on further inspection we can confirm that the issue is still active and
being investigated. We apologize for the inconvenience.




Impact Statement: Starting at 18:46 UTC on 16 Sep 2024, customers using Azure Virtual Desktop may notice a reduction in the
diagnostic data we collect. This is a temporary adjustment aimed at stabilizing our backend databases as part of our ongoing
investigation into the issues stemming from incident 1LG8-1X0.

 

Current status: The decision to reduce diagnostics collection is a precaution to avoid a recurrence of the challenges we faced
during that incident. One of the triggers of the incident was traced to an overload of data being written to database replicas,
which triggered delays, automatic failovers, and ultimately led to a database outage. By temporarily limiting the amount of
diagnostic data captured, we are reducing the load on the databases and mitigating potential replication issues, thus improving
service stability.

 

This is a temporary solution until we roll out a permanent fix.

 

The diagnostics that we will no longer be ingesting are exclusive to "Feed and management diagnostics". One of the triggers of the
incident was a degradation in the speed at which data was written to database replicas, which triggered delays, automatic
failovers, and ultimately led to a database outage. We are working on a fix and a rollout. We will provide an update by 28 October
2024. ```


- October 21, 2024 at 5:46 AM: ```What happened?

Between 18:46 UTC on 16 Sep 2024, and 21:43 UTC on 20 October 2024, customers using Azure Virtual Desktop may have noticed a
reduction in the diagnostic data we collect. This was a temporary adjustment aimed at stabilizing our backend databases as part of
our previously ongoing investigation into the issues stemming from incident 1LG8-1X0.




Current Status: This incident has been mitigated. More information will be provided shortly.```
