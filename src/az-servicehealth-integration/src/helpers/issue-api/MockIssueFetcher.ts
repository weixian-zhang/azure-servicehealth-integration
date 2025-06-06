import IssueFilterer from "./IssueFilterer";
import IIssueFetcher from "./IIssueFetcher";
import { ServiceIssue, ImpactedService, ImpactUpdates, ImpactedResource, Subscription } from "./ServiceIssueModels";
import * as fs from 'fs';
import * as _ from 'lodash';
import Path from 'path';

export default class MockIssueGenerator implements IIssueFetcher {
    // wogTenantName = "WOG";
    techpassTenantName = "TechPass";
    issuesDataPath: string = Path.join(__dirname, "test-data", "issues-from-resource-health-sdk-type-event_2.json"); //__dirname + "\\test-data\\sea_issues_only_from_rest_api_response.json";
    impactedResourcesDataPath: string = __dirname + "\\test-data\\impacted_resources_from_rest_api_response.json";
    regionToFilter = "Southeast Asia";
    
    //reuse ApiIssueFetcher and add/edit/remove issue data
    async fetchIssuesAndImpactedResources(): Promise<ServiceIssue[]> {

        let issueBag = new Map<string, ServiceIssue>();

        const issues = await this.listIssuesBySubscriptionIds();
        
        let curr: number = 0;
        const numOfIssuesToReturn: number = 20;

        const subscriptions = [
            new Subscription('213-axx-000001-xxaa222312', 'sub-12'),
            new Subscription('213-axx-000001-xxaa222313', 'sub-13'),
            new Subscription('213-axx-000001-xxaa222314', 'sub-14')
        ]

        for (const sub of subscriptions) {
            for (const currIssue of issues) {

                if (curr == numOfIssuesToReturn) {
                    return Array.from(issueBag.values()); //Promise.resolve(result);
                }
    
                const trackingId = currIssue.name;
    
                IssueFilterer.createAndFilterIssues(sub, currIssue, issueBag);
                
                curr++;
            }
        }

        return Array.from(issueBag.values());
    }

    private async fetchImpactedResourcesForIssue(trackingId: string, issueBag: Map<string, ServiceIssue>) {
            
        const data = await fs.promises.readFile(this.impactedResourcesDataPath, "utf8");
        let ips = JSON.parse(data) as any[];
        ips = ips['value'];

        for (let ip of ips) {

            if (_.isEmpty(ip.properties.targetResourceId)) {
                continue;
            }

            IssueFilterer.createImpactedResourceInIssueBag(ip, trackingId, issueBag)
        }
    }

    private async listIssuesBySubscriptionIds() : Promise<any[]> {
        const data = await fs.promises.readFile(this.issuesDataPath, "utf8");
        let issues = JSON.parse(data);
        return Array.from(issues);
    }
}

// if (issue.properties.eventType != 'ServiceIssue') {
            //     continue;
            // }
            
            // const [seaRegionImpacted, si] = IssueFilterer.createServiceIssue(wogTenantName, issue);

            // if (!seaRegionImpacted) {
            //     continue;
            // }
        
            // // is previously collected issue
            // if (si.TrackingId in serviceIssues) {

            //     IssueFilterer.groupImpactedServicesByTrackingId(si, serviceIssues);
            // }
            // else
            // {
            //     serviceIssues.set(si.TrackingId, si);
            // }
            
// let si = new ServiceIssue();

            // si.TenantName = 'WOG';
            // si.TrackingId = issue.name
            // si.OverallStatus = issue.properties.status
            // si.Title = issue.properties.title
            // si.Summary = issue.properties.summary
            // si.Description =issue.properties.description
            // si.ImpactStartTime = issue.properties.impactStartTime;
            // si.ImpactMitigationTime = issue.properties.impactMitigationTime;
            // si.LastUpdateTime = new Date(issue.properties.lastUpdateTime);
            // si.LastUpdateTimeEpoch = si.LastUpdateTime.valueOf();
            // si.Level = issue.properties.Level;
            // si.LevelDescription = IssueFilterer.getLevelDescription(si.Level);
            // si.ImpactedServices = new Array();
            // si.ImpactedResources = new Array();

            // issue.properties.impact.forEach(impact => {

            //     impact.impactedRegions.forEach(region => {

            //         if (region.impactedRegion == this.regionToFilter || region.impactedRegion == "Global") {

            //             const impactedSvc = new ImpactedService();

            //             impactedSvc.ImpactedService = impact.impactedService;
            //             impactedSvc.IsGlobal = (region.impactedRegion == "Global") ? true : false;
            //             impactedSvc.SEARegionOrGlobalStatus = region.status;
            //             impactedSvc.SEARegionOrGlobalLastUpdateTime = new Date(region.lastUpdateTime);
            //             impactedSvc.ImpactedTenants = region.impactedTenants;
            //             impactedSvc.ImpactedSubscriptions = region.impactedSubscriptions;
                        
            //             impactedSvc.ImpactUpdates = new Array();
                        
            //             if (!_.isEmpty(region.updates)) {

            //                 for (const u of region.updates) {

            //                     const iu = new ImpactUpdates();
            //                     iu.Summary = u.summary;
            //                     iu.UpdateDateTime = new Date(u.updateDateTime);
            //                     iu.UpdateEpoch = iu.UpdateDateTime.valueOf();
    
            //                     impactedSvc.ImpactUpdates.push(iu);
            //                 }
            //             }
                        
            //             si.ImpactedServices.push(impactedSvc);

            //         }

            //     });

            // });

            // // only include an issue when there is one or more SEA region impacted services 
            // if (!_.isEmpty(si.ImpactedServices)) {
            //     result.push(si);
            // }

            

        // const r = new Array();
        // r.push(result[0])
        // return Promise.resolve(r);