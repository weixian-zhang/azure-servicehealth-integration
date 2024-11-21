import { ServiceIssue, ImpactedService, ImpactUpdates, ImpactedResource, Subscription } from "./ServiceIssueModels";
import IIssueFetcher from "./IIssueFetcher";
import { ClientSecretCredential  } from "@azure/identity"
import { MicrosoftResourceHealth, EventsListBySubscriptionIdOptionalParams } from "@azure/arm-resourcehealth"
import { InvocationContext } from "@azure/functions";
import AppConfig from "../AppConfig";
import * as _ from 'lodash';
import IssueFilterer from "./IssueFilterer";

//service issue json schema
//https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-tenant-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#listeventsbytenantid

// static token credential
// https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-with-a-pre-fetched-access-token

// impacted resources
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-tenant-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP

// sample codes
// https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/eventsListByTenantIdSample.ts

export default class ApiIssueFetcher implements IIssueFetcher {
    appconfig: AppConfig;
    context: InvocationContext;
    regionToFilter = "Southeast Asia";
    tenantName: string;
    subscriptions: Subscription[];
    mrh: MicrosoftResourceHealth;
    //azcred: ClientSecretCredential;

    constructor(tenantName: string, mrh: MicrosoftResourceHealth, subscriptions: Subscription[], appconfig: AppConfig) {
        //(tenantName: string, azcred: ClientSecretCredential, subscriptions: Subscription[], appconfig: AppConfig) {
        this.tenantName = tenantName;
        this.appconfig = appconfig;
        this.subscriptions = subscriptions;
        this.mrh = mrh;
    }
    

    async fetchIssuesAndImpactedResources() : Promise<ServiceIssue[]> {
        
        try {
            
            let serviceIssues = await this._fetchIssuesAndImpactedResources();


            if (_.isEmpty(serviceIssues)) {
                return []
            }

            return serviceIssues
        
        } catch (e) {
            globalThis.funcContext.error(e.message,  {is_error: true});
            throw e;
        }

    }


    private async _fetchIssuesAndImpactedResources() : Promise<ServiceIssue[]> {

        let result = new Array<ServiceIssue>();
        let issueBag = new Map<string, ServiceIssue>();
        
        const queryStartTime = this.appconfig.incidentQueryStartFromDate;

        const options: EventsListBySubscriptionIdOptionalParams = {
            queryStartTime
        };


        for (const sub of this.subscriptions) {

            this.mrh.subscriptionId = sub.Id;
            //const rhc = new MicrosoftResourceHealth(this.azcred, sub.Id);
            
            try {
                for await (const currIssue of this.mrh.eventsOperations.listBySubscriptionId(options)) {
                
                    const trackingId = currIssue.name;
    
                    IssueFilterer.createAndFilterIssues(this.tenantName, sub, currIssue, issueBag);
    
                    
                    if (issueBag.has(trackingId)) {
                        // get impacted resources
                        await this.fetchImpactedResourcesForIssue(trackingId, issueBag);
                    }
                }
            } catch (e) {
                globalThis.funcContext.error(e.message,  {is_error: true});
            }
        }

        return Array.from(issueBag.values());
    }

    // API reference:
    // https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/impactedResourcesListByTenantIdAndEventIdSample.ts
    private async fetchImpactedResourcesForIssue(trackingId: string, issueBag: Map<string, ServiceIssue>) {
            
        if (_.isEmpty(issueBag)) {
            return [];
        }

        for await (let resource of this.mrh.impactedResources.listBySubscriptionIdAndEventId(trackingId)) {//this.resourceHealthClient.impactedResources.listByTenantIdAndEventId(issue.TrackingId)) {

            IssueFilterer.createImpactedResourceInIssueBag(resource, trackingId, issueBag);
        }
    }
}