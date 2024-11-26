*Azure Incident Report (Test)*

- Title: 	Post Incident Review (PIR) - Azure Resource Manager - Services impacted by ARM failures
- Affected Services: Azure Relay, Event Hubs, Service Bus
- Status: 	Resolved
- Subscriptions Impacted: **250**
- Impact Start Time: 	Jan 21 2024 at 11:02 
- Impact Mitigation Time: Jan 22 2024 at 2:14

*Impacted Subscriptions*

- 213-axx-000001-xxaa-222333 | mesos-001-11-sub-1
- 213-axx-000001-xxaa-222333 | mesos-001-11-sub-1
- 213-axx-000001-xxaa-222333 | mesos-001-11-sub-1
- 213-axx-000001-xxaa-222333 | mesos-001-11-sub-1
- 213-axx-000001-xxaa-222333 | mesos-001-11-sub-1

*Impacted Resources*


*Azure Relay*
- Status: Resolved
- Last Updated At: March 4, 2024 at 1:02 PM
- Updates

March 4, 2024 at 1:02 PM - ```
<p><strong>What happened?</strong></p>\n<p>Between 10:01 UTC on 28 October 2024 and 18:07 UTC on 01 November 2024, a subset of customers using App Service may have experienced erroneous 404 failure notifications for the Microsoft.Web/sites/workflows API from alerts and recorded into their logs.</p>\n<p><strong>What we know so far?</strong></p>\n<p>We identified a previous change to a backend service which caused backend operations to be called to apps incorrectly.</p>\n<p><strong>How did we respond?</strong></p>\n<p>We were alerted to this issue via customer reports and responded to investigate. We applied steps to limit the erroneous failures to alleviate additional erroneous alerts and logging of these. Additionally, we’ve taken steps to revert the previous change.</p>\n<p><strong>What happens next?</strong></p>\n<ul><li>To request a Post Incident Review (PIR), impacted customers can use the “Request PIR” feature within Azure Service Health. (Note: We're in the process of transitioning from \"Root Cause Analyses (RCAs)\" to \"Post Incident Reviews (PIRs)\", so you may temporarily see both terms used interchangeably in the Azure portal and in Service Health alerts.)</li><li>To get notified if a PIR is published, and/or to stay informed about future Azure service issues, make sure that you configure and maintain Azure Service Health alerts – these can trigger emails, SMS, push notifications, webhooks, and more:&nbsp;<a href=\"https://aka.ms/ash-alerts\" target=\"_blank\">https://aka.ms/ash-alerts</a>.</li><li>For more information on Post Incident Reviews, refer to&nbsp;<a href=\"https://aka.ms/AzurePIRs\" target=\"_blank\">https://aka.ms/AzurePIRs</a>.</li><li>Finally, for broader guidance on preparing for cloud incidents, refer to&nbsp;<a href=\"https://aka.ms/incidentreadiness\" target=\"_blank\">https://aka.ms/incidentreadiness</a>.</li></ul>
```
<br />

<table>
<tr>
    <th>Updated At</th>
    <th>Summary</th>
</tr>
<tr>
    <td>
        <div style="width:120px">
            March 4, 2024 at 1:02 PM
        </div>
    </td>
    <td>
    <div style="overflow-y: scroll;max-height:400px"  markdown="block">
    A short update intentionally added to test css overflow-y: scroll
    </div>
    </td>
</tr>
<tr>
    <td>
        <div style="width:120px">
            January 31, 2024 at 7:02 PM
        </div>
    </td>
    <td>
    <div style="overflow-y: scroll;max-height:400px"  markdown="block">
    <div id="update-summary" >
                                        <p><em>Join our upcoming 'Azure Incident Retrospective' livestream about this incident: </em><a href="https://aka.ms/AIR8.1/reg" target="_blank"><em>https://aka.ms/AIR8.1/reg</em></a><em>&nbsp;</em></p>
<p><strong>What happened?&nbsp;</strong></p>
<p>Between 01:30 and 08:58 UTC on 21 January 2024, customers attempting to leverage Azure Resource Manager (ARM) may have experienced issues when performing resource management operations. This impacted ARM calls that were made via Azure CLI, Azure PowerShell and the Azure portal. While the impact was predominantly experienced in Central US, East US, South Central US, West Central US, and West Europe, impact may have been experienced to a lesser degree in other regions due to the global nature of ARM.&nbsp;</p>
<p>This incident also impacted downstream Azure services which depend upon ARM for their internal resource management operations – including Analysis Services, Azure Container Registry, API Management, App Service, Backup, Bastion, CDN, Center for SAP solutions, Chaos Studio, Data Factory, Database for MySQL flexible servers, Database for PostgreSQL, Databricks, Device Update for IoT Hub, Event Hubs, Front Door, Key Vault, Log Analytics, Migrate, Relay, Service Bus, SQL Database, Storage, Synapse Analytics, and Virtual Machines.&nbsp;</p>
<p>In several cases, data plane impact on downstream Azure services was the result of dependencies on ARM for retrieval of Role Based Access Control (RBAC) data (see: <a href="https://learn.microsoft.com/azure/role-based-access-control/overview" target="_blank">https://learn.microsoft.com/azure/role-based-access-control/overview</a>). For example, services including Storage, Key Vault, Event Hub, and Service Bus rely on ARM to download RBAC authorization policies. During this incident, these services were unable to retrieve updated RBAC information and once the cached data expired these services failed, rejecting incoming requests in the absence of up-to-date access policies. In addition, several internal offerings depend on ARM to support on-demand capacity and configuration changes, leading to degradation and failure when ARM was unable to process their requests.&nbsp;</p>
<p><strong>What went wrong and why?&nbsp;</strong></p>
<p>In June 2020, ARM deployed a private preview integration with Entra Continuous Access Evaluation (see: <a href="https://learn.microsoft.com/entra/identity/conditional-access/concept-continuous-access-evaluation" target="_blank">https://learn.microsoft.com/entra/identity/conditional-access/concept-continuous-access-evaluation</a>). This feature is to support continuous access evaluation for ARM, and was only enabled for a small set of tenants and private preview customers. Unbeknownst to us, this preview feature of the ARM CAE implementation contained a latent code defect that caused issues when authentication to Entra failed. The defect would cause ARM nodes to fail on startup whenever ARM could not authenticate to an Entra tenant enrolled in the preview.&nbsp;</p>
<p>On 21 January 2024, an internal maintenance process made a configuration change to an internal tenant which was enrolled in this preview. This triggered the latent code defect and caused ARM nodes, which are designed to restart periodically, to fail repeatedly upon startup. ARM nodes restart periodically by design, to account for automated recovery from transient changes in the underlying platform, and to protect against accidental resource exhaustion such as memory leaks.&nbsp;</p>
<p>Due to these ongoing node restarts and failed startups, ARM began experiencing a gradual loss in capacity to serve requests. Eventually this led to an overwhelming of the remaining ARM nodes, which created a negative feedback loop (increased load resulted in increased timeouts, leading to increased retries and a corresponding further increase in load) and led to a rapid drop in availability. Over time, this impact was experienced in additional regions – predominantly affecting East US, South Central US, Central US, West Central US, and West Europe.&nbsp;</p>
<p><strong>How did we respond?&nbsp;</strong></p>
<p>At 01:59 UTC, our monitoring detected a decrease in availability, and we began an investigation. Automated communications to a subset of impacted customers began shortly thereafter and, as impact to additional regions became better understood, we decided to communicate publicly via the Azure Status page. By 04:25 UTC we had correlated the preview feature to the ongoing impact. We mitigated by making a configuration change to disable the feature. The mitigation began to rollout at 04:51 UTC, and ARM recovered in all regions except West Europe by 05:30 UTC.&nbsp;</p>
<p>The recovery in West Europe was slowed because of a retry storm from failed ARM calls, which increased traffic in West Europe by over 20x, causing CPU spikes on our ARM instances. Because most of this traffic originated from trusted internal systems, by default we allowed it to bypass throughput restrictions which would have normally throttled such traffic. We increased throttling of these requests in West Europe which eventually alleviated our CPUs and enabled ARM to recover in the region by 08:58 UTC, at which point the underlying ARM incident was fully mitigated.&nbsp;</p>
<p>The vast majority of downstream Azure services recovered shortly thereafter. Specific to Key Vault, we identified a latent bug which resulted in application crashes when latency to ARM from the Key Vault data plane was persistently high. This extended the impact for Vaults in East US and West Europe, beyond the vaults that opted into Azure RBAC.&nbsp;</p>
<ul><li>20 January 2024 @ 21:00 UTC – An internal maintenance process made a configuration change to an internal tenant enrolled in the CAE private preview.&nbsp;</li><li>20 January 2024 @ 21:16 UTC – First ARM roles start experiencing startup failures, but no customer impact as ARM still has sufficient capacity to serve requests.&nbsp;</li><li>21 January 2024 @ 01:30 UTC – Initial customer impact due to continued capacity loss in several large ARM regions.&nbsp;</li><li>21 January 2024 @ 01:59 UTC – Monitoring detected additional failures in the ARM service, and on-call engineers began immediate investigation.&nbsp;</li><li>21 January 2024 @ 02:23 UTC – Automated communication sent to impacted customers started.&nbsp;</li><li>21 January 2024 @ 03:04 UTC – Additional ARM impact was detected in East US and West Europe.&nbsp;</li><li>21 January 2024 @ 03:24 UTC – Due to additional impact identified in other regions, we raised the severity of the incident, and engaged additional teams to assist in troubleshooting.&nbsp;</li><li>21 January 2024 @ 03:30 UTC – Additional ARM impact was detected in South Central US.&nbsp;</li><li>21 January 2024 @ 03:57 UTC – We posted broad communications via the Azure Status page.&nbsp;</li><li>21 January 2024 @ 04:25 UTC – The causes of impact were understood, and a mitigation strategy was developed.&nbsp;</li><li>21 January 2024 @ 04:51 UTC – We began the rollout of this configuration change to disable the preview feature.&nbsp;</li><li>21 January 2024 @ 05:30 UTC – ARM recovered in all regions except West Europe.&nbsp;</li><li>21 January 2024 @ 08:58 UTC – ARM recovered in West Europe, mitigating vast majority of customer impact beyond specific services who took more time to recover.&nbsp;</li><li>21 January 2024 @ 09:28 UTC – Key Vault recovered instances in West Europe by adding new scale sets to replace the VMs that had crashed due to the code bug.&nbsp;</li></ul>
<p><strong>How are we making incidents like this less likely or less impactful?&nbsp;</strong></p>
<p></p><ul><li>Our ARM team have already disabled the preview feature through a configuration update. (Completed)&nbsp;</li><li>We have offboarded all tenants from the CAE private preview, as a precaution. (Completed)&nbsp;</li><li>Our Entra team improved the rollout of that type of per-tenant configuration change to wait for multiple input signals, including from canary regions. (Completed)&nbsp;</li><li>Our Key Vault team has fixed the code that resulted in applications crashing when they were unable to refresh their RBAC caches. (Completed)&nbsp;</li><li>We are gradually rolling out a change to proceed with node restart when a tenant-specific call fails. (Estimated completion: February 2024)&nbsp;</li><li>Our ARM team will audit dependencies in role startup logic to de-risk scenarios like this one. (Estimated completion: February 2024)&nbsp;</li><li>Our ARM team will leverage Azure Front Door to dynamically distribute traffic for protection against retry storm or similar events. (Estimated completion: February 2024)&nbsp;</li><li>We are improving monitoring signals on role crashes for reduced time spent on identifying the cause(s), and for earlier detection of availability impact. (Estimated completion: February 2024)&nbsp;</li><li>Our Key Vault, Service Bus and Event Hub teams will migrate to a more robust implementation of the Azure RBAC system that no longer relies on ARM and is regionally isolated with standardized implementation. (Estimated completion: February 2024)&nbsp;</li><li>Our Container Registry team are building a solution to detect and auto-fix stale network connections, to recover more quickly from incidents like this one. (Estimated completion: February 2024)&nbsp;</li><li>Finally, our Key Vault team are adding better fault injection tests and detection logic for RBAC downstream dependencies. (Estimated completion: March 2024).&nbsp;</li></ul><p><strong>How can we make our incident communications more useful?&nbsp;</strong></p><p>You can rate this PIR and provide any feedback using our quick 3-question survey: <a href="https://aka.ms/AzPIR/NKRF-1TG" target="_blank">https://aka.ms/AzPIR/NKRF-1TG</a></p><p></p>
        </div>
        </div>
    </td>
</tr>
<tr>
    <td>January 24, 2024 at 7:01 PM</td>
    <td>
        <div style="overflow-y: scroll;max-height:400px"  markdown="block">
            <div id="update-summary">
                                        <p>This is our "Preliminary" PIR that we endeavor to publish within 3 days of incident mitigation, to share what we know so far. After our internal retrospective is completed (generally within 14 days) we will publish a "Final" PIR with additional details/learnings.</p>
<p><br></p>
<p><strong>What happened?</strong></p>
<p><br></p>
<p>Between 01:57 and 08:58 UTC on 21 January 2024, customers attempting to leverage Azure Resource Manager (ARM) may have experienced issues when performing resource management operations. This impacted ARM calls that were made via Azure CLI, Azure PowerShell and the Azure portal. This also impacted downstream Azure services, which depend upon ARM for their internal resource management operations. While the impact was predominantly experienced in East US, South Central US, Central US, West Central US, and West Europe, due to the global nature of ARM impact may have been experienced to a lesser degree in other regions.</p>
<p><br></p>
<p><strong>What do we know so far?</strong></p>
<p><br></p>
<p>In June 2020, ARM deployed a feature in preview, to support continuous access evaluation (https://learn.microsoft.com/entra/identity/conditional-access/concept-continuous-access-evaluation), which was only enabled for a small set of tenants. Unbeknownst to us, this preview feature contained a latent code defect. This caused ARM nodes to fail on startup whenever ARM could not authenticate to an Entra tenant enrolled in the preview. On 21 January 2024, an internal maintenance process made a configuration change to an internal tenant which was enrolled in this preview . This triggered the latent code defect and caused any ARM nodes, which are designed to restart periodically, to fail repeatedly upon startup. The reason that ARM nodes restart periodically is due to transient changes in the underlying platform, and to protect against accidental resource exhaustion such as memory leaks. Due to these failed startups, ARM began experiencing a gradual loss in capacity to serve requests. Over time, this impact spread to additional regions, predominantly affecting East US, South Central US, Central US, West Central US, and West Europe. Eventually this loss of capacity led to an overwhelming of the remaining ARM nodes, which created a negative feedback loop and led to a rapid drop in availability.</p>
<p><br></p>
<p><strong>How did we respond?</strong></p>
<p><br></p>
<p>At 01:59 UTC, our monitoring detected a decrease in availability, and we began an immediate investigation. Automated communications to a subset of impacted customers began shortly thereafter and, as impact to additional regions became better understood, we decided to communicate publicly via the Azure Status page. The causes of the issue were understood by 04:25 UTC. We mitigated impact by making a configuration change to disable the preview feature. The mitigation began roll out at 04:51 UTC, and all regions except West Europe were recovered by 05:30 UTC. The recovery of West Europe was slowed because of a retry storm from failed calls, which intensified traffic in West Europe. We increased throttling of certain requests in West Europe which eventually enabled its recovery by 08:58 UTC, at which point all customer impact was fully mitigated.</p>
<p><br></p>
<p>•    21 January 2024 @ 01:59 UTC – Monitoring detected decrease in availability for the ARM service, and on-call engineers began immediate investigation.</p>
<p>•    21 January 2024 @ 02:23 UTC – Automated communication sent to impacted customers started.</p>
<p>•   21 January 2024 @ 03:04 UTC – Additional ARM impact was detected in East US and West Europe.</p>
<p>•    21 January 2024 @ 03:24 UTC – Due to additional impact identified in other regions, we raised the severity of the incident, and engaged additional teams to assist in troubleshooting.</p>
<p>•  21 January 2024 @ 03:30 UTC – Additional ARM impact was detected in South Central US.</p>
<p>•   21 January 2024 @ 03:57 UTC – We posted broad communications via the Azure Status page.</p>
<p>• 21 January 2024 @ 04:25 UTC – The causes of impact were understood, and a mitigation strategy was developed.</p>
<p>•    21 January 2024 @ 04:51 UTC – We began the rollout of this configuration change to disable the preview feature.</p>
<p>• 21 January 2024 @ 05:30 UTC – All regions except West Europe were recovered.</p>
<p>•    21 January 2024 @ 08:58 UTC – West Europe recovered, fully mitigating all customer impact.</p>
<p><br></p>
<p><strong>What happens next?</strong></p>
<p><br></p>
<p>•  We have already disabled the preview feature through a configuration update. (Completed)</p>
<p>•    We are gradually rolling out a change to proceed with node restart when a tenant-specific call fails. (Estimated completion: February 2024)</p>
<p>• After our internal retrospective is completed (generally within 14 days) we will publish a "Final" PIR with additional details/learnings.</p>
<p><br></p>
<p><strong>How can we make our incident communications more useful?</strong></p>
<p><br></p>
<p>You can rate this PIR and provide any feedback using our quick <a href="https://customervoice.microsoft.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbRxYsbHJUQAdChwAJoetCuW5UQlUxQlhaQjQ4SlNZOUs1WDZMMFNDWlBORyQlQCN0PWcu&amp;ctx=%7B%22TrackingID%22:%22NKRF-1TG%22%7D" target="_blank">3-question survey</a>.</p>
                                        </div>
        </div>
    </td>
</tr>
<tr>
    <td>
        <div style="width:120px">
            January 24, 2024 at 7:01 PM
        </div>
    </td>
    <td>
        <div style="overflow-y: scroll;max-height:400px"  markdown="block">
                                                       <div id="update-summary">
                                        <p><strong>Summary of Impact:</strong> Between 01:25 UTC and 09:45 UTC on 21 Jan 2024, you were identified as a customer using Service Bus, Event Hub and / or Azure Relay who may have experienced performance issues with resources hosted in this region.</p>
<p><strong>Preliminary Root-Cause:</strong> We determined that Azure Resource Manager experienced an outage and impacted our service, resulting in the failure to perform service management operations services.</p>
<p><strong>Mitigation:</strong> Once the incident with the dependent service was resolved, our services recovered.&nbsp;Having monitored for some time we can confirm that service functionality has been restored.&nbsp;</p>
<p><strong>Next Steps: </strong>We will follow up in 3 days with a preliminary Post Incident Report (PIR), which will cover the initial root cause and repair items. We'll follow that up 14 days later with a final PIR where we will share a deep dive into the incident.</p>
                                        </div>
        </div>
    </td>
</tr>
</table>

---  

### <mark>**Event Hubs**</mark>
* Status: Resolved
* Last Updated At: March 4, 2024 at 1:02 PM

<br />

<table>
    <tr>
        <th>Updated At</th>
        <th>Summary</th>
    </tr>
    <tr>
        <td>
            <div style="width:120px">
                March 3, 2024 at 11:02 PM
            </div>
        </td>
        <td>
            <div style="overflow-y: scroll; max-height:400px"  markdown="block">
                <p><strong>What happened?</strong></p>\n<p>Between 10:01 UTC on 28 October 2024 and 18:07 UTC on 01 November 2024, a subset of customers using App Service may have experienced erroneous 404 failure notifications for the Microsoft.Web/sites/workflows API from alerts and recorded into their logs.</p>\n<p><strong>What we know so far?</strong></p>\n<p>We identified a previous change to a backend service which caused backend operations to be called to apps incorrectly.</p>\n<p><strong>How did we respond?</strong></p>\n<p>We were alerted to this issue via customer reports and responded to investigate. We applied steps to limit the erroneous failures to alleviate additional erroneous alerts and logging of these. Additionally, we’ve taken steps to revert the previous change.</p>\n<p><strong>What happens next?</strong></p>\n<ul><li>To request a Post Incident Review (PIR), impacted customers can use the “Request PIR” feature within Azure Service Health. (Note: We're in the process of transitioning from \"Root Cause Analyses (RCAs)\" to \"Post Incident Reviews (PIRs)\", so you may temporarily see both terms used interchangeably in the Azure portal and in Service Health alerts.)</li><li>To get notified if a PIR is published, and/or to stay informed about future Azure service issues, make sure that you configure and maintain Azure Service Health alerts – these can trigger emails, SMS, push notifications, webhooks, and more:&nbsp;<a href=\"https://aka.ms/ash-alerts\" target=\"_blank\">https://aka.ms/ash-alerts</a>.</li><li>For more information on Post Incident Reviews, refer to&nbsp;<a href=\"https://aka.ms/AzurePIRs\" target=\"_blank\">https://aka.ms/AzurePIRs</a>.</li><li>Finally, for broader guidance on preparing for cloud incidents, refer to&nbsp;<a href=\"https://aka.ms/incidentreadiness\" target=\"_blank\">https://aka.ms/incidentreadiness</a>.</li></ul>
            </div>
        </td>
    </tr>
    <tr>
        <td>
            <div style="width:120px">
                March 4, 2024 at 1:02 PM
            </div>
        </td>
        <td>
            <div style="overflow-y: scroll; max-height:400px"  markdown="block">
                <p><strong>Impact Statement:</strong> Starting at 10:01 UTC on 28 October 2024, a subset of customers using App Service may have experienced erroneous 404 failure notifications for the Microsoft.Web/sites/workflows API from alerts and recorded into their logs.</p>\n<p><strong>Current Status:</strong> We have applied steps to limit the erroneous failures to alleviate additional erroneous alerts and logging of these. Additionally, we’re taking steps to revert a previous change which caused backend operations to be called to apps incorrectly. We’ll provide an update within the next 2 hours or as events warrant.</p>
            </div>
        </td>
    </tr>
</table>
