import {DB, TrackedImpactedService, TrackedIssue} from './db/DB';
import * as _ from 'lodash';
import { ServiceIssue } from './issue-api/ServiceIssueModels';
import { InvocationContext } from '@azure/functions/types/InvocationContext';
import { promises } from 'dns';

class ImpactedServiceMapItem {
    LastUpdateTime: number;
    Status: string
}

// **Asumption: when service issue reaches this stage, ImpactedServices property will never be empty
// impacted service region will either be Global or SEA
export default class SendIssueDecisionTree {
    Resolved: string = "Resolved";
    Active: string = "Active";
    context: InvocationContext;
    db: DB;

    constructor() {
        
    }

    async init() {
        this.db = new DB();
        await this.db.initDB()
    }

    // decision tree to determine if an issue can be sent
    // issue level
        // issue is Resolved and no tracked issue is found in DB
            // do nothing
        // issue is Resolved and tracked issue is also Resolved
            // do nothing
        // issue is Active and no tracked issue is found in DB
            // save as tracked issue
            // dmark-issue-to-send
        // issue status change from Active to Resolved
            // update tracked issue status to Resolved
            // mark-issue-to-send
        // impacted service SEA region only level
            // any one of the issue's impacted service has newer "lastUpdateTime"
                // update impacted service lastUpdatedTime to lasted updated time
                // mark-issue-to-send
            // any one of the issue's impacted service status change from Active to Resolved
                // update impacted service
                    // status to Resolved
                    // lastUpdatedTime to latest updated time from issue
                // mark-issue-to-send
    public async determineShouldSendIssues(context: InvocationContext, issues: ServiceIssue[]): Promise<ServiceIssue[]> {
        

        this.context = context;

        if (_.isEmpty(issues)) {
            return []
        }

        const issuesToSend = new Array<ServiceIssue>();
    
        for (const issue of issues) {

            const [isTracked, trackedIssue] = await this.db.issueExist(issue.TrackingId);

            //issue not tracked
            if (!isTracked) {

                // issue is Resolved and issue not tracked
                if (issue.OverallStatus == this.Resolved) {
                    continue;
                }

                // issue is Active and no tracked issue is found in DB
                if (issue.OverallStatus == this.Active) {
                    await this.db.addIssue(issue);
                    issuesToSend.push(issue);
                    continue;
                }

            }
            // issue was tracked
            else {
                // issue is Resolved while tracked issue is also Resolved
                if (issue.OverallStatus == this.Resolved && trackedIssue.Status == this.Resolved ) {
                    continue;
                }

                // issue status change from Active to Resolved
                if (issue.OverallStatus == this.Resolved && trackedIssue.Status == this.Active) {
                    await this.db.updateIssueResolved(issue.TrackingId, issue.LastUpdateTime)
                    issuesToSend.push(issue);
                    continue;
                }

                // Issue is Active and tracked issue is also active
                // then check if there are updates to each impacted services
                // *note: each impacted service for each region, can have separate updates
                // ** only looking at SEA region impacted services only
                if (issue.OverallStatus == this.Active && trackedIssue.Status == this.Active) {

                    const trackedImpactedServices: Map<string, TrackedImpactedService> =
                        await this.db.getImpactedServices(issue.TrackingId);//Map<string, TrackedImpactedService> = await this.db.getImpactedServices(issue.TrackingId);

                    // all issue at this point is "tracked", and MUST have SEA region impacted services
                    for (const svc of issue.ImpactedServices ) {

                        //const trackedIS = impactedServices.get(svc.ImpactedService);
                        const trackedIS = trackedImpactedServices.get(svc.ImpactedService);

                        // deciding whether to throw error as there is no possibility to be null
                        if (_.isNil(trackedIS)) {
                            //TODO throw error or not
                            continue;
                        }

                        // impacted service has newer "lastUpdateTime"
                        if (svc.SEARegionOrGlobalLastUpdateTime.valueOf() > trackedIS.LastUpdateTime) {
                            this.context.info
                                (`
                                Issue with Tracking Id ${issue.TrackingId} is an existing issue, with new update at ${new Date(issue.LastUpdateTime )}.
                                Previous update was at ${new Date(issue.LastUpdateTime)}} mark for sending.
                                `)
                            
                            await this.db.updateImpactedServiceLastUpdateTime(issue.TrackingId, svc.ImpactedService, svc.SEARegionOrGlobalLastUpdateTime);
                            
                            issuesToSend.push(issue);
                        }
                        else if (svc.SEARegionOrGlobalStatus == this.Resolved && trackedIS.Status == this.Active) {
                            await this.db.updateImpactedServiceResolved(issue.TrackingId, svc.ImpactedService, svc.SEARegionOrGlobalLastUpdateTime);
                            
                            issuesToSend.push(issue);
                        }
                    }
                }

            }
            
        }

        return issuesToSend;
    }
}