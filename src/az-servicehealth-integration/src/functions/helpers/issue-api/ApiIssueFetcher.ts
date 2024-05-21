import { ServiceIssue, ImpactedService, ImpactUpdates, ImpactedResource, Subscription } from "./ServiceIssueModels";
import IIssueFetcher from "./IIssueFetcher";
import { ClientSecretCredential  } from "@azure/identity"
import { MicrosoftResourceHealth, EventsListBySubscriptionIdOptionalParams } from "@azure/arm-resourcehealth"
import { InvocationContext } from "@azure/functions";
import AppConfig from "../AppConfig";
import * as _ from 'lodash';
import FetcherHelper from "./FetcherHelper";

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

        let serviceIssues = new Array();

        const queryStartTime = this.appconfig.incidentQueryStartFromDate;

        const options: EventsListBySubscriptionIdOptionalParams = {
            queryStartTime
        };

        for (const sub of this.subscriptions) {

            const rhc = new MicrosoftResourceHealth(this.azcred, sub.Id);

            for await (let issue of rhc.eventsOperations.listBySubscriptionId(options)) { 

                if (issue.eventType != 'ServiceIssue') {
                    continue;
                }
    
                let si = new ServiceIssue();
    
                si.TenantName = this.tenantName;
                si.TrackingId = issue.name;
                si.OverallStatus = issue.status;
                si.Title = issue.title;
                si.Summary = issue.summary;
                si.Description =issue.description;
                si.ImpactStartTime = issue.impactStartTime;
                si.ImpactMitigationTime = issue.impactMitigationTime;
                si.LastUpdateTime = new Date(issue.lastUpdateTime);
                si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
                si.Level = issue.level;
                si.LevelDescription = FetcherHelper.getLevelDescription(issue.level);
                si.ImpactedServices = new Array();
                si.ImpactedResources = new Array();
    
                issue.impact.forEach(impact => {
    
                    impact.impactedRegions.forEach(region => {
    
                        if (region.impactedRegion == this.regionToFilter || region.impactedRegion == "Global") {
    
                            const impactedSvc = new ImpactedService();
    
                            impactedSvc.ImpactedService = impact.impactedService;
                            impactedSvc.IsGlobal = (region.impactedRegion == "Global") ? true : false;
                            impactedSvc.SEARegionOrGlobalStatus = region.status;
                            impactedSvc.SEARegionOrGlobalLastUpdateTime = new Date(region.lastUpdateTime);
                            impactedSvc.ImpactedTenants = region.impactedTenants;
                            impactedSvc.ImpactedSubscriptions = region.impactedSubscriptions;
                            impactedSvc.ImpactUpdates = new Array();
                            
                            if (!_.isEmpty(region.updates)) {
    
                                for (const u of region.updates) {
    
                                    const iu = new ImpactUpdates();
                                    iu.Summary = u.summary;
                                    iu.UpdateDateTime = new Date(u.updateDateTime);
                                    iu.UpdateEpoch = iu.UpdateDateTime.valueOf();
        
                                    impactedSvc.ImpactUpdates.push(iu);
                                }
                            }
                            
                            si.ImpactedServices.push(impactedSvc);
    
                        }
    
                    });
    
                });
    
                // only include a service issue when there is either service is impacted Global or in SEA region 
                if (!_.isEmpty(si.ImpactedServices)) {
                    serviceIssues.push(si);
                }
    
            }
            
            // for each subscription, get impacted resources
            serviceIssues = await this.forEachIssueIncludeImpactedResources(rhc, serviceIssues)
        }

    
        return serviceIssues
    }

    // sample code
    // https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/impactedResourcesListByTenantIdAndEventIdSample.ts
    private async forEachIssueIncludeImpactedResources(rhc: MicrosoftResourceHealth, issues: ServiceIssue[]) : Promise<ServiceIssue[]> {
        
        if (_.isEmpty(issues)) {
            return [];
        }

        issues.forEach(async issue => {
        
            for await (let resource of rhc.impactedResources.listBySubscriptionIdAndEventId(issue.TrackingId)) {//this.resourceHealthClient.impactedResources.listByTenantIdAndEventId(issue.TrackingId)) {

                const ir = new ImpactedResource();
                const rscArr = resource.targetResourceId.split("/");
                ir.SubscriptionId =  (rscArr[1]) ? rscArr[1] : "";
                ir.ResourceGroup = resource.resourceGroup;
                ir.ResourceType = resource.targetResourceType;
                ir.ResourceName =  resource.resourceName;
                
                issue.ImpactedResources.push(ir);
            }

        });

        return issues;
    }



}