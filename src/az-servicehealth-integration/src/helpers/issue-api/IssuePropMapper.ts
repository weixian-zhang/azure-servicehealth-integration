import { serialize } from "v8";
import { ImpactUpdates, ImpactedResource, ImpactedService, ServiceIssue, Subscription } from "./ServiceIssueModels";
import * as _ from 'lodash';
import { SubscriptionsGetOptionalParams } from "@azure/arm-resources-subscriptions";

export default class IssuePropMapper {
    static regionToFilter = ["Southeast Asia"];
    static levelMap = {
        'Error': 'Widespread issues accessing multiple services across multiple regions are impacting a broad set of customers',
        'Warning': 'Issues accessing specific services and/or specific regions are impacting a subset of customers',
        'Informational': 'Issues impacting management operations and/or latency, not impacting service availability'
    }

    static getLevelDescription(level: string) {
        if (level in IssuePropMapper.levelMap) {
            return IssuePropMapper.levelMap[level];
        }
        return '';
    }

    //issue type is @azure/arm-resourcehealth/PagedAsyncIterableIterator<Event_2, Event_2[], PageSettings> or | any (mock Json data)
    static createIssueInIssueBag(tenantName: string, subscription: Subscription, currIssue: any, issueBag: Map<string, ServiceIssue>) {

        const eventType = _.isNil(currIssue.eventType) ? currIssue.properties.eventType : currIssue.eventType;

        //'EmergingIssues'
        if (!['ServiceIssue'].includes(eventType) ) {
            return;
        }
        
        let si = new ServiceIssue();

        si.TenantName = tenantName;
        si.TrackingId = currIssue.name || '';
        si.OverallStatus = IssuePropMapper.getNonNullValue(_.get(currIssue, 'status'), _.get(currIssue, 'properties.status'),  ''); //_.isNil(currIssue.status) ? currIssue.properties.status : currIssue.status;
        si.Title = IssuePropMapper.getNonNullValue(_.get(currIssue, 'title'), _.get(currIssue, 'properties.title'), ''); //!_.isNil(currIssue.title) ? currIssue.title : !_.isNil(currIssue.properties.title) ?  currIssue.properties.title: '';
        si.Summary = IssuePropMapper.getNonNullValue(_.get(currIssue, 'summary'), _.get(currIssue, 'properties.summary'), ''); //!_.isNil(currIssue.summary) ? currIssue.summary : !_.isNil(currIssue.properties.summary) ? currIssue.properties.summary: '';
        si.Description = IssuePropMapper.getNonNullValue(_.get(currIssue, 'description'), _.get(currIssue, 'properties.description'), '');
        si.ImpactStartTime =  IssuePropMapper.getNonNullValue(_.get(currIssue, 'impactStartTime'), _.get(currIssue, 'properties.impactStartTime'), ''); //!_.isNil(currIssue.impactStartTime) ? new Date(currIssue.impactStartTime) : _.isNil(currIssue.properties.impactStartTime) ? new Date(currIssue.properties.impactStartTime): null;
        si.ImpactMitigationTime = IssuePropMapper.getNonNullValue(_.get(currIssue, 'impactMitigationTime'), _.get(currIssue, 'properties.lastUpdateTime'), ''); //!_.isNil(currIssue.impactMitigationTime) ? new Date(currIssue.impactMitigationTime) : !_.isNil(currIssue.properties.impactMitigationTime) ? new Date(currIssue.properties.impactMitigationTime): null;
        si.LastUpdateTime =  IssuePropMapper.getNonNullValue(_.get(currIssue, 'lastUpdateTime'), _.get(currIssue, 'properties.lastUpdateTime'), ''); //!_.isNil(currIssue.lastUpdateTime) ? new Date(currIssue.lastUpdateTime) : !_.isNil(currIssue.properties.lastUpdateTime) ? new Date(currIssue.properties.lastUpdateTime) : null;
        si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
        si.Level =  IssuePropMapper.getNonNullValue(_.get(currIssue, 'level'), _.get(currIssue, 'properties.level'), ''); //!_.isNil(currIssue.level) ? currIssue.level : !_.isNil(currIssue.properties.level) ? currIssue.properties.level: '';
        si.LevelDescription = IssuePropMapper.getLevelDescription(si.Level);
        si.ImpactedServices = new Array();
        si.ImpactedResources = new Array();
        si.ImpactedSubscriptions = new Array<Subscription>();

        const impact = IssuePropMapper.getNonNullValue(_.get(currIssue, 'impact'), _.get(currIssue, 'properties.impact'), []);

        impact.forEach(impact => {

            impact.impactedRegions.forEach(region => {

                if (this.regionToFilter.includes(region.impactedRegion ) || region.impactedRegion == "Global") {

                    const impactedSvc = new ImpactedService();

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
        if (_.isNil(si.ImpactedServices)) {
            return;
        }

        si.addImpactedSubscription(subscription);

        // is previously collected issue
        if (issueBag.has(si.TrackingId)) {

            IssuePropMapper.groupImpactedServicesByTrackingId(si, issueBag);
        }
        else
        {
            issueBag.set(si.TrackingId, si);
        }
    }

    //as List by Subscription Id is called multiple by the number of subscription Id this app's service principal has access to
    //issues retrieved will have duplicates, but the impacted services could be different as different services exist in different subscriptions
    // this function groups up or merge impacted services by same tracking id.
    static groupImpactedServicesByTrackingId(currIssue: ServiceIssue, issueBag: Map<string, ServiceIssue>) {

        currIssue.ImpactedServices.forEach(cisvc => {
           
            const prevIssue: ServiceIssue = issueBag.get(currIssue.TrackingId);
    
            const index = prevIssue.ImpactedServices.findIndex((previsvc) => previsvc.ImpactedService == cisvc.ImpactedService)
    
            if (index == -1) {
                prevIssue.ImpactedServices.push(cisvc);
                //issueBag.set(currIssue.TrackingId, prevIssue);
            }
    
        })
    }

    static createImpactedResourceInIssueBag
        (impactedRsc: any, trackingId: string, issueBag: Map<string, ServiceIssue>) {
        
        const id = IssuePropMapper.getNonNullValue(
            _.get(impactedRsc, 'targetResourceId', ''),
            _.get(impactedRsc, 'properties.targetResourceId', ''),
            'error capturing resource Id');
        
        const rArr: any[] = id.split("/");
        
        const ir = new ImpactedResource();
        ir.Id = id;
        ir.SubscriptionId =  rArr[2];
        ir.ResourceType = IssuePropMapper.getNonNullValue(
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



