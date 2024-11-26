import { ImpactUpdates, ImpactedResource, ImpactedService, ServiceIssue, Subscription } from "./ServiceIssueModels";
import * as _ from 'lodash';

export default class IssueFilterer {
    static regionToFilter = ["Southeast Asia"];
    static levelMap = {
        'Error': 'Widespread issues accessing multiple services across multiple regions are impacting a broad set of customers',
        'Warning': 'Issues accessing specific services and/or specific regions are impacting a subset of customers',
        'Informational': 'Issues impacting management operations and/or latency, not impacting service availability'
    }

    static getLevelDescription(level: string) {
        if (level in IssueFilterer.levelMap) {
            return IssueFilterer.levelMap[level];
        }
        return '';
    }

    
    
    // core logic to determine if an issue should be included in issue bag
    // 1. only Service Incidents are considered, ignoring Planned Maintenance, Health Advisory and Security Advisory
    //   exclude 'EmergingIssues' incident type
    // 2. only include Global or SEA region incidents
    // 3. only include "eventLevel" of [Warning, Error] as Informtional level does not impact service availability
    //      Error - Widespread issues accessing multiple services across multiple regions are impacting a broad set of customers.
    //      Warning - Issues accessing specific services and/or specific regions are impacting a subset of customers.
    //      Informational - Issues impacting management operations and/or latency, not impacting service availability.
    //   (https://learn.microsoft.com/en-us/azure/service-health/service-health-notifications-properties)

    // 4. Reason for getting IssueObject."properties" in addition to just property name is that
    //    - test data in /test-data has unflattened Json schema where each property starts with i.e properties.title

    // 5. "List by Subscription Id" function is called multiple times, depending on number of subscription Ids this app's service principal has access to,
    // hence, issues retrieved will have duplicates.
    // But the impacted services could be different as different services exist in different subscriptions,
    // so this function merges different impacted services by same Tracking Id.
    static createAndFilterIssues(subscription: Subscription, currIssue: any, issueBag: Map<string, ServiceIssue>, tenantName: string = "TechPass", ) {

        const eventType = _.isNil(currIssue.eventType) ? currIssue.properties.eventType : currIssue.eventType;
        const eventLevel = _.isNil(currIssue.eventLevel) ? currIssue.properties.eventLevel : currIssue.eventLevel;

        
        if (!['ServiceIssue'].includes(eventType) ) {
            return;
        }

        if (!['Informational', 'Warning', 'Error'].includes(eventLevel)) {
            return;
        }
        
        let si = new ServiceIssue();

        si.TenantName = tenantName;
        si.TrackingId = currIssue.name || '';
        si.OverallStatus = IssueFilterer.getNonNullValue(_.get(currIssue, 'status'), _.get(currIssue, 'properties.status'),  ''); //_.isNil(currIssue.status) ? currIssue.properties.status : currIssue.status;
        si.Title = IssueFilterer.getNonNullValue(_.get(currIssue, 'title'), _.get(currIssue, 'properties.title'), ''); //!_.isNil(currIssue.title) ? currIssue.title : !_.isNil(currIssue.properties.title) ?  currIssue.properties.title: '';
        si.Summary = IssueFilterer.getNonNullValue(_.get(currIssue, 'summary'), _.get(currIssue, 'properties.summary'), ''); //!_.isNil(currIssue.summary) ? currIssue.summary : !_.isNil(currIssue.properties.summary) ? currIssue.properties.summary: '';
        si.Description = IssueFilterer.getNonNullValue(_.get(currIssue, 'description'), _.get(currIssue, 'properties.description'), '');
        si.ImpactStartTime =  IssueFilterer.getNonNullValue(_.get(currIssue, 'impactStartTime'), _.get(currIssue, 'properties.impactStartTime'), ''); //!_.isNil(currIssue.impactStartTime) ? new Date(currIssue.impactStartTime) : _.isNil(currIssue.properties.impactStartTime) ? new Date(currIssue.properties.impactStartTime): null;
        si.ImpactMitigationTime = IssueFilterer.getNonNullValue(_.get(currIssue, 'impactMitigationTime'), _.get(currIssue, 'properties.lastUpdateTime'), ''); //!_.isNil(currIssue.impactMitigationTime) ? new Date(currIssue.impactMitigationTime) : !_.isNil(currIssue.properties.impactMitigationTime) ? new Date(currIssue.properties.impactMitigationTime): null;
        si.LastUpdateTime =  IssueFilterer.getNonNullValue(_.get(currIssue, 'lastUpdateTime'), _.get(currIssue, 'properties.lastUpdateTime'), ''); //!_.isNil(currIssue.lastUpdateTime) ? new Date(currIssue.lastUpdateTime) : !_.isNil(currIssue.properties.lastUpdateTime) ? new Date(currIssue.properties.lastUpdateTime) : null;
        si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
        si.Level =  IssueFilterer.getNonNullValue(_.get(currIssue, 'level', ''), _.get(currIssue, 'properties.level'), ''); //!_.isNil(currIssue.level) ? currIssue.level : !_.isNil(currIssue.properties.level) ? currIssue.properties.level: '';
        si.LevelDescription = IssueFilterer.getLevelDescription(si.Level);
        si.ImpactedServices = new Array();
        si.ImpactedResources = new Array();
        si.ImpactedSubscriptions = new Array<Subscription>();

        const impactedRegions = new Set<string>();

        const impact = IssueFilterer.getNonNullValue(_.get(currIssue, 'impact', []), _.get(currIssue, 'properties.impact'), []);

        impact.forEach(impact => {

            impact.impactedRegions.forEach(region => {

                if (this.regionToFilter.includes(region.impactedRegion ) || region.impactedRegion == "Global") {

                    const impactedSvc = new ImpactedService();

                    impactedRegions.add(region.impactedRegion);

                    impactedSvc.ImpactedService = impact.impactedService;
                    impactedSvc.IsGlobal = (region.impactedRegion == "Global") ? true : false;
                    impactedSvc.SEARegionOrGlobalStatus = region.status;
                    impactedSvc.SEARegionOrGlobalLastUpdateTime = new Date(region.lastUpdateTime);
                    impactedSvc.ImpactedTenants = region.impactedTenants;
                    impactedSvc.ImpactedSubscriptions = region.impactedSubscriptions;
                    impactedSvc.ImpactUpdates = new Array();
                    
                    if (!_.isNil(region.updates)) {

                        for (const u of region.updates) {

                            const iu = new ImpactUpdates();
                            iu.Summary = u.summary;
                            iu.UpdateDateTime = new Date(u.updateDateTime);
                            iu.UpdateEpoch = iu.UpdateDateTime.valueOf();

                            impactedSvc.ImpactUpdates.push(iu);
                        }
                    }

                    si.ImpactedServicesNames.push(impact.impactedService);
                    
                    si.ImpactedServices.push(impactedSvc);
                }

            }); // end foreach region

        }); // end foreach impact

        
        // only include an issue when there is a service that is impacted Globally or in SEA region
        // ignore issue that are non-global or other regions
        if (_.isEmpty(si.ImpactedServices)) {
            return;
        }

        si.ImpactedRegions = Array.from(impactedRegions).join(', ');

        si.addImpactedSubscription(subscription);

        // is previously collected issue
        if (issueBag.has(si.TrackingId)) {

            IssueFilterer.groupImpactedServicesByTrackingId(si, issueBag);
        }
        else
        {
            issueBag.set(si.TrackingId, si);
        }
    }

    // * "List by Subscription Id" function is called multiple times, depending on number of subscription Ids this app's service principal has access to,
    // hence, issues retrieved will have duplicates.
    // But the impacted services could be different as different services exist in different subscriptions,
    // so this function merges different impacted services by same Tracking Id.
    static groupImpactedServicesByTrackingId(currIssue: ServiceIssue, issueBag: Map<string, ServiceIssue>) {

        currIssue.ImpactedServices.forEach(cisvc => {
           
            const prevIssue: ServiceIssue = issueBag.get(currIssue.TrackingId);
    
            const index = prevIssue.ImpactedServices.findIndex((previsvc) => previsvc.ImpactedService == cisvc.ImpactedService)
    
            if (index == -1) {
                prevIssue.ImpactedServices.push(cisvc);
            }
        })
    }

    static createImpactedResourceInIssueBag
        (impactedRsc: any, trackingId: string, issueBag: Map<string, ServiceIssue>) {
        
        const id = IssueFilterer.getNonNullValue(
            _.get(impactedRsc, 'targetResourceId', ''),
            _.get(impactedRsc, 'properties.targetResourceId', ''),
            'error capturing resource Id');
        
        const rArr: any[] = id.split("/");
        
        const ir = new ImpactedResource();
        ir.IssueEventId = trackingId;
        ir.Id = id;
        ir.SubscriptionId =  rArr[2];
        ir.ResourceType = IssueFilterer.getNonNullValue(
            _.get(impactedRsc, 'properties.targetResourceType', ''),
            _.get(impactedRsc, 'targetResourceType', ''),
            '');
        ir.ResourceName =  impactedRsc.name;
        ir.ResourceGroup = rArr.reverse()[4];
        
        issueBag.get(trackingId).ImpactedResources.push(ir);
    }

    static getNonNullValue(...args: any[]) {

        if (args.length == 0) {
            return ''
        }

        const defaultVal = args[args.length - 1]

        for (var arg of args) {
            if (!_.isNil(arg) && !_.isEmpty(arg)) {
                return arg
            }
        } 

        return defaultVal;
    }
}



