import FetcherHelper from "./FetcherHelper";
import IIssueFetcher from "./IIssueFetcher";
import { ServiceIssue, ImpactedService, ImpactUpdates, ImpactedResource } from "./ServiceIssueModels";
import * as fs from 'fs';
import * as _ from 'lodash';
export default class MockIssueGenerator implements IIssueFetcher {
    wogTenantName = "WOG";
    techpassTenantName = "TechPass";
    dataPath: string = "src/functions/helpers/issue-api/mock-data/sea_issues_only.json";
    regionToFilter = "Southeast Asia";
    
    //reuse ApiIssueFetcher and add/edit/remove issue data
    async getIssuesAndImpactedResourcesAtTenantLevel(): Promise<ServiceIssue[]> {

        const data = await fs.promises.readFile(this.dataPath, "utf8");

        let issues = JSON.parse(data) as any[];
        
        let curr: number = 0;
        const numOfIssuesToReturn: number = 10;
        const result = new Array<ServiceIssue>();

        for (const issue of issues) {

            if (curr == numOfIssuesToReturn) {
                return Promise.resolve(result);
            }

            if (issue.properties.eventType != 'ServiceIssue') {
                continue;
            }

            let si = new ServiceIssue();

            si.TenantName = 'WOG';
            si.TrackingId = issue.name
            si.OverallStatus = issue.properties.status
            si.Title = issue.properties.title
            si.Summary = issue.properties.summary
            si.Description =issue.properties.description
            si.ImpactStartTime = issue.properties.impactStartTime;
            si.ImpactMitigationTime = issue.properties.impactMitigationTime;
            si.LastUpdateTime = new Date(issue.properties.lastUpdateTime);
            si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
            si.Level = issue.properties.Level;
            si.LevelDescription = FetcherHelper.getLevelDescription(si.Level);
            si.ImpactedServices = new Array();
            si.ImpactedResources = new Array();

            issue.properties.impact.forEach(impact => {

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

            // only include an issue when there is one or more SEA region impacted services 
            if (!_.isEmpty(si.ImpactedServices)) {
                result.push(si);
            }

            curr++;
        };

        const r = new Array();
        r.push(result[0])
        return Promise.resolve(r);
    }
    

}