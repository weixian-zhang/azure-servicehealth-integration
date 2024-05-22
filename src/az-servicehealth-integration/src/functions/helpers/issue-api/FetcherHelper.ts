import { ImpactUpdates, ImpactedResource, ImpactedService, ServiceIssue } from "./ServiceIssueModels";
import * as _ from 'lodash';

export default class FetcherHelper {
    static regionToFilter = "Southeast Asia";
    static levelMap = {
        'Error': 'Widespread issues accessing multiple services across multiple regions are impacting a broad set of customers',
        'Warning': 'Issues accessing specific services and/or specific regions are impacting a subset of customers',
        'Informational': 'Issues impacting management operations and/or latency, not impacting service availability'
    }

    static getLevelDescription(level: string) {
        if (level in FetcherHelper.levelMap) {
            return FetcherHelper.levelMap[level];
        }
        return '';
    }

    //issue type is @azure/arm-resourcehealth/PagedAsyncIterableIterator<Event_2, Event_2[], PageSettings> or | any (mock Json data)
    static createIssueInIssueBag(tenantName: string, currIssue: any, issueBag: Map<string, ServiceIssue>) {

        const eventType = _.isEmpty(currIssue.eventType) ? currIssue.properties.eventType : currIssue.eventType;

        if (eventType != 'ServiceIssue') {
            return;
        }
        
        let si = new ServiceIssue();

        si.TenantName = tenantName;
        si.TrackingId = currIssue.name;
        si.OverallStatus = _.isEmpty(currIssue.status) ? currIssue.properties.status : currIssue.status;
        si.Title = _.isEmpty(currIssue.title) ? currIssue.properties.title : currIssue.title;
        si.Summary = _.isEmpty(currIssue.summary) ? currIssue.properties.summary : currIssue.summary;
        si.Description = _.isEmpty(currIssue.description) ? currIssue.properties.description : currIssue.description;
        si.ImpactStartTime = _.isEmpty(currIssue.impactStartTime) ? new Date(currIssue.properties.impactStartTime) : new Date(currIssue.impactStartTime);
        si.ImpactMitigationTime = _.isEmpty(currIssue.impactMitigationTime) ? new Date(currIssue.properties.impactMitigationTime) : new Date(currIssue.impactMitigationTime);
        si.LastUpdateTime = _.isEmpty(currIssue.lastUpdateTime) ? new Date(currIssue.properties.lastUpdateTime) : new Date(currIssue.lastUpdateTime);
        si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
        si.Level = _.isEmpty(currIssue.level) ? currIssue.properties.level : currIssue.level;
        si.LevelDescription = FetcherHelper.getLevelDescription(si.Level);
        si.ImpactedServices = new Array();
        si.ImpactedResources = new Array();

        const impact = _.isEmpty(currIssue.impact) ? currIssue.properties.impact : currIssue.impact;

        impact.forEach(impact => {

            //const regions = _.isEmpty(impact.impactedRegions) ? impact. : currIssue.impactedRegions;

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

            }); // end foreach region

        }); // end foreach impact
        
        // only include an issue when there is a service that is impacted Globally or in SEA region
        // ignore issue that are non-global or other regions
        if (_.isEmpty(si.ImpactedServices)) {
            return;
        }

        // is previously collected issue
        if (si.TrackingId in issueBag) {

            FetcherHelper.groupImpactedServicesByTrackingId(si, issueBag);
        }
        else
        {
            issueBag.set(si.TrackingId, si);
        }
        
    }

    //as List by Subscription Id is called multiple by the number of subscription Id this app's service principal has access to
    //issues retrieved will have duplicates, but the impacted services could be different as different services exist in different subscriptions
    // this function groups up or merge impacted services by same tracking id.
    static groupImpactedServicesByTrackingId(currIssue: ServiceIssue, serviceIssues: Map<string, ServiceIssue>) {

        currIssue.ImpactedServices.forEach(cisvc => {
           
            const prevImpactedServices: ImpactedService[] = serviceIssues[currIssue.TrackingId].ImpactedServices;
    
            const index = prevImpactedServices.findIndex((previsvc) => previsvc.ImpactedService == cisvc.ImpactedService)
    
            if (index == -1) {
                serviceIssues[currIssue.TrackingId].ImpactedServices.push(cisvc);
            }
    
        })
    }

    static createImpactedResourceInIssueBag
        (trackingId: string, subscriptionId: string, resource: any, issueBag: Map<string, ServiceIssue>) {
        const ir = new ImpactedResource();
        ir.Id = resource.id;
        ir.SubscriptionId =  subscriptionId;
        ir.ResourceGroup = resource.resourceGroup;
        ir.ResourceType = resource.targetResourceType;
        ir.ResourceName =  resource.resourceName;
        issueBag[trackingId].ImpactedResources.push(ir);
    }
}



