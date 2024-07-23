import { ServiceIssue, ImpactedService, ImpactUpdates, ImpactedResource, Subscription } from "./ServiceIssueModels";
import IIssueFetcher from "./IIssueFetcher";
import { ClientSecretCredential  } from "@azure/identity"
import { MicrosoftResourceHealth, EventsListBySubscriptionIdOptionalParams } from "@azure/arm-resourcehealth"
import { InvocationContext } from "@azure/functions";
import AppConfig from "../AppConfig";
import * as _ from 'lodash';
import IssueHelper from "./IssueHelper";

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
    azcred: ClientSecretCredential;

    constructor(tenantName: string, azcred: ClientSecretCredential, subscriptions: Subscription[], appconfig: AppConfig, context: InvocationContext) {
        this.tenantName = tenantName;
        this.appconfig = appconfig;
        this.context = context;
        this.subscriptions = subscriptions;
        this.azcred = azcred;
    }
    

    async fetchIssuesAndImpactedResources() : Promise<ServiceIssue[]> {
        
        try {
            
            let serviceIssues = await this._fetchIssuesAndImpactedResources();


            if (_.isEmpty(serviceIssues)) {
                return []
            }

            return serviceIssues
        
        } catch (e) {
            this.context.error(e.message);
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

            const rhc = new MicrosoftResourceHealth(this.azcred, sub.Id);

            for await (const currIssue of rhc.eventsOperations.listBySubscriptionId(options)) {
                
                const trackingId = currIssue.name;

                IssueHelper.createIssueInIssueBag(this.tenantName, sub, currIssue, issueBag);


                // get impacted resources
                await this.fetchImpactedResourcesForIssue(rhc, trackingId, issueBag);
                
                if (issueBag.has(trackingId)) {
                    // get impacted resources
                    await this.fetchImpactedResourcesForIssue(rhc, trackingId, issueBag);
                }
            } 
        }

        return Array.from(issueBag.values());
    }

    // sample code
    // https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/impactedResourcesListByTenantIdAndEventIdSample.ts
    private async fetchImpactedResourcesForIssue
        (rhc: MicrosoftResourceHealth, trackingId: string, issueBag: Map<string, ServiceIssue>) {
            
        if (_.isEmpty(issueBag)) {
            return [];
        }

        for await (let resource of rhc.impactedResources.listBySubscriptionIdAndEventId(trackingId)) {//this.resourceHealthClient.impactedResources.listByTenantIdAndEventId(issue.TrackingId)) {

            IssueHelper.createImpactedResourceInIssueBag(resource, trackingId, issueBag);
        }
    }

    
            

            //await this.forEachIssueIncludeImpactedResources(rhc, Array.from(serviceIssues.values()));

            // for await (let issue of rhc.eventsOperations.listBySubscriptionId(options)) { 

            //     if (issue.eventType != 'ServiceIssue') {
            //         continue;
            //     }

            //     const [seaRegionImpacted, si] = IssueHelper.createServiceIssue(this.tenantName, issue);

            //     if (!seaRegionImpacted) {
            //         continue;
            //     }

            //     // is previously collected issue
            //     if (si.TrackingId in serviceIssues) {

            //         IssueHelper.groupImpactedServicesByTrackingId(si, serviceIssues);
            //     }
            //     else
            //     {
            //         serviceIssues.set(si.TrackingId, si);
            //     }

    
            //     // let si = new ServiceIssue();
    
            //     // si.TenantName = this.tenantName;
            //     // si.TrackingId = issue.name;
            //     // si.OverallStatus = issue.status;
            //     // si.Title = issue.title;
            //     // si.Summary = issue.summary;
            //     // si.Description =issue.description;
            //     // si.ImpactStartTime = issue.impactStartTime;
            //     // si.ImpactMitigationTime = issue.impactMitigationTime;
            //     // si.LastUpdateTime = new Date(issue.lastUpdateTime);
            //     // si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
            //     // si.Level = issue.level;
            //     // si.LevelDescription = IssueHelper.getLevelDescription(issue.level);
            //     // si.ImpactedServices = new Array();
            //     // si.ImpactedResources = new Array();
    
            //     // issue.impact.forEach(impact => {
    
            //     //     impact.impactedRegions.forEach(region => {
    
            //     //         if (region.impactedRegion == this.regionToFilter || region.impactedRegion == "Global") {
    
            //     //             const impactedSvc = new ImpactedService();
    
            //     //             impactedSvc.ImpactedService = impact.impactedService;
            //     //             impactedSvc.IsGlobal = (region.impactedRegion == "Global") ? true : false;
            //     //             impactedSvc.SEARegionOrGlobalStatus = region.status;
            //     //             impactedSvc.SEARegionOrGlobalLastUpdateTime = new Date(region.lastUpdateTime);
            //     //             impactedSvc.ImpactedTenants = region.impactedTenants;
            //     //             impactedSvc.ImpactedSubscriptions = region.impactedSubscriptions;
            //     //             impactedSvc.ImpactUpdates = new Array();
                            
            //     //             if (!_.isEmpty(region.updates)) {
    
            //     //                 for (const u of region.updates) {
    
            //     //                     const iu = new ImpactUpdates();
            //     //                     iu.Summary = u.summary;
            //     //                     iu.UpdateDateTime = new Date(u.updateDateTime);
            //     //                     iu.UpdateEpoch = iu.UpdateDateTime.valueOf();
        
            //     //                     impactedSvc.ImpactUpdates.push(iu);
            //     //                 }
            //     //             }
                            
            //     //             si.ImpactedServices.push(impactedSvc);
            //     //         }
    
            //     //     });
    
            //     // });
                
            //     // // only include an issue when there is a service that is impacted Globally or in SEA region
            //     // // ignore issue that are non-global or other regions
            //     // if (_.isEmpty(si.ImpactedServices)) {
            //     //     continue;
            //     // }

            // }

    //as List by Subscription Id is called multiple by the number of subscription Id this app's service principal has access to
    //issues retrieved will have duplicates, but the impacted services could be different as different services exist in different subscriptions
    // this function groups up or merge impacted services by same tracking id.
    // private groupImpactedServicesByTrackingId(currIssue: ServiceIssue, serviceIssues: Map<string, ServiceIssue>) {

    //     currIssue.ImpactedServices.forEach(cisvc => {
           
    //         const prevImpactedServices: ImpactedService[] = serviceIssues[currIssue.TrackingId].ImpactedServices;

    //         const index = prevImpactedServices.findIndex((previsvc) => previsvc.ImpactedService == cisvc.ImpactedService)

    //         if (index == -1) {
    //             serviceIssues[currIssue.TrackingId].ImpactedServices.push(cisvc);
    //         }

    //     })
    // }


    

}