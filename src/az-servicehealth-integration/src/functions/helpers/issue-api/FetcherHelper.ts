import { ImpactUpdates, ImpactedService, ServiceIssue } from "./ServiceIssueModels";
import * as _ from 'lodash';

export default class FetcherHelper {

    //issue type is @azure/arm-resourcehealth/Event_2
    static createServiceIssue(tenantName: string, issue: any) : [boolean, ServiceIssue] {
        
        if (issue.eventType != 'ServiceIssue') {
            return [false, null]
        }

        let si = new ServiceIssue();

        si.TenantName = tenantName;
        si.TrackingId = issue.name
        si.Status = issue.status
        si.Title = issue.title
        si.Summary = issue.summary
        si.Description =issue.description
        si.ImpactStartTime = issue.impactStartTime;
        si.ImpactMitigationTime = issue.impactMitigationTime;
        si.LastUpdateTime = new Date(issue.lastUpdateTime);
        si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
        si.ImpactedServices = new Array();
        si.ImpactedResources = new Array();

        issue.impact.forEach(impact => {

            impact.impactedRegions.forEach(region => {

                //** to enable after testing
                //if (region.impactedRegion == this.regionToFilter || region.impactedRegion == "Global") {

                    const impactedSvc = new ImpactedService();

                    impactedSvc.ImpactedService = impact.impactedService;
                    impactedSvc.SoutheastAsiaRegionStatus = region.status;
                    impactedSvc.ImpactedTenants = region.impactedTenants;
                    impactedSvc.ImpactedSubscriptions = region.impactedSubscriptions;
                    impactedSvc.LastUpdateTime = region.lastUpdateTime;
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

                //}

            });

        });

        return [true, issue]
    }
}