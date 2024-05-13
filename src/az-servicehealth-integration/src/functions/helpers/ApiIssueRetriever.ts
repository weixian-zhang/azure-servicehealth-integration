import { ServiceIssue, ImpactedService, ImpactUpdates } from "./ServiceIssueModels";
import IIssueRetriever from "./IIssueRetriever";
import { ClientSecretCredential, DefaultAzureCredential   } from "@azure/identity"
import { MicrosoftResourceHealth, EventsListByTenantIdOptionalParams, EventsListBySubscriptionIdOptionalParams } from "@azure/arm-resourcehealth"
import { ArrayHelper } from "./HelperFuncs";
import { InvocationContext } from "@azure/functions";

//service issue json schema
//https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-tenant-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#listeventsbytenantid

// static token credential
// https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-with-a-pre-fetched-access-token

// impacted resources
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-tenant-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP

// sample codes
// https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/eventsListByTenantIdSample.ts

export default class ApiIssueRetriever implements IIssueRetriever {

    resourceHealthClient : MicrosoftResourceHealth;
    context: InvocationContext;
    regionToFilter = "Southeast Asia";

    constructor(context: InvocationContext) {
        this.context = context;
        const subId = "00000000-0000-0000-0000-000000000000";
        this.resourceHealthClient = new MicrosoftResourceHealth(new DefaultAzureCredential(), subId);
    }
    
    async getIssuesAndImpactedResourcesAtTenantLevel() : Promise<ServiceIssue[]> {
        
        try {
            
            let serviceIssues = await this.getServiceIssues();


            if (ArrayHelper.isEmpty(serviceIssues)) {
                return []
            }

            serviceIssues = await this.forEachIssueIncludeImpactedResources(serviceIssues);

            return serviceIssues
        
        } catch (e) {
            this.context.error(e.message);
            throw e;
        }

    }

    private async getServiceIssues() : Promise<ServiceIssue[]> {

        let serviceIssues = new Array();

        const filter = "region eq 'Southeast Asia'";
        const queryStartTime = "1/1/2020";
        // const options: EventsListByTenantIdOptionalParams = {
        //     queryStartTime
        // };
        const options: EventsListBySubscriptionIdOptionalParams = {
            queryStartTime
        };

        // const iterator = this.resourceHealthClient.eventsOperations.listByTenantId(null)
        // let next;

        for await (let issue of this.resourceHealthClient.eventsOperations.listBySubscriptionId(options)) { //this.resourceHealthClient.eventsOperations.listByTenantId()) {

            if (issue.eventType != 'ServiceIssue') {
                continue;
            }

            let si = new ServiceIssue();

            si.TrackingId = issue.name
            si.Status = issue.status
            si.Title = issue.title
            si.Summary = issue.summary
            si.Description =issue.description
            si.ImpactStartTime = issue.impactStartTime;
            si.ImpactMitigationTime = issue.impactMitigationTime;

            issue.impact.forEach(impact => {

                impact.impactedRegions.forEach(region => {

                    if (region.impactedRegion && region.impactedRegion != this.regionToFilter) {
                        return;
                    }

                    const impactedSvc = new ImpactedService();

                    impactedSvc.ImpactedService = impact.impactedService;
                    impactedSvc.SoutheastAsiaRegionStatus = region.status;
                    impactedSvc.ImpactedTenants = region.impactedTenants;
                    impactedSvc.ImpactedSubscriptions = region.impactedSubscriptions;
                    impactedSvc.LastUpdateTime = region.lastUpdateTime;
                    
                    region.updates.forEach(update => {

                        const iu = new ImpactUpdates();
                        iu.Summary = update.summary;
                        iu.UpdateDateTime = new Date(update.updateDateTime);
                        iu.UpdateEpoch = iu.UpdateDateTime.valueOf();

                        impactedSvc.ImpactUpdates.push(iu);

                    });

                    si.ImpactedServices.push(impactedSvc);

                });

            });

            // only include an issue when there is one or more SEA region impacted services 
            if (!ArrayHelper.isEmpty(si.ImpactedServices)) {
                serviceIssues.push(si);
            }

        }


        serviceIssues = await this.forEachIssueIncludeImpactedResources(serviceIssues)


        return serviceIssues
    }

    // sample code
    // https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/impactedResourcesListByTenantIdAndEventIdSample.ts
    private async forEachIssueIncludeImpactedResources(issues: ServiceIssue[]) : Promise<ServiceIssue[]> {
        
        if (ArrayHelper.isEmpty(issues)) {
            return []
        }

        let result = new Array();

        issues.forEach(async issue => {
        
            const iterator = this.resourceHealthClient.impactedResources.listByTenantIdAndEventId(issue.TrackingId);
            let next;;

            while ((next = await iterator.next()).done === false) {

                const ip = next.value;

                if (ip) {
                    const jip = JSON.parse(ip)


                }
            }

        });

        return result;
    }



}