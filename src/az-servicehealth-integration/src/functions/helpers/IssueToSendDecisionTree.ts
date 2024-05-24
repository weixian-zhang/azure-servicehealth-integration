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
export default class IssueToSendDecisionTree {
    Resolved: string = "Resolved";
    Active: string = "Active";
    context: InvocationContext;

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

            // if (_.isEmpty(issue.ImpactedServices)) {
            //     throw new Error("ImpactedServices is empty at IssueSendStateManager");
            // }

            const [exist, trackedIssue] = await globalThis.db.issueExist(issue.TrackingId);

            // issue is Resolved and no tracked issue found in DB
            if (issue.OverallStatus == this.Resolved && !exist) {
                continue;
            }
            
            // issue is Resolved and tracked issue is also Resolved, do nothing
            else if (issue.OverallStatus == this.Resolved && (exist && trackedIssue.Status == this.Resolved )) {
                continue;
            }

            // issue is Active and no tracked issue is found in DB
            else if (issue.OverallStatus == this.Active && !exist) {
                await globalThis.db.addIssue(issue);
                issuesToSend.push(issue);
                continue;
            }

            // issue status change from Active to Resolved
            else if (issue.OverallStatus == this.Resolved && trackedIssue.Status == this.Active) {
                await globalThis.db.updateIssueResolved(issue.TrackingId, issue.LastUpdateTime)
                issuesToSend.push(issue);
                continue;
            }

            // impacted service SEA region only level
            else {

                const impactedServices: Map<string, TrackedImpactedService> = await globalThis.db.getImpactedServices(issue.TrackingId);

                // all issue at this point is "tracked", and MUST have SEA region impacted services
                for (const svc of issue.ImpactedServices ) {

                    const trackedIS = impactedServices.get(svc.ImpactedService);

                    // deciding whether to throw error as there is no possibility to be null
                    if (_.isEmpty(trackedIS)) {
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
                        
                        await globalThis.db.updateImpactedServiceLastUpdateTime(issue.TrackingId, svc.ImpactedService, svc.SEARegionOrGlobalLastUpdateTime);
                        
                        issuesToSend.push(issue);
                    }
                    else if (svc.SEARegionOrGlobalStatus == this.Resolved && trackedIS.Status == this.Active) {
                        await globalThis.db.updateImpactedServiceResolved(issue.TrackingId, svc.ImpactedService, svc.SEARegionOrGlobalLastUpdateTime);
                        
                        issuesToSend.push(issue);
                    }
                }

            }
        }

        return issuesToSend;
    }
}