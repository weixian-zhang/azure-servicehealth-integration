import {DB, Issue} from './db/DB';
import * as _ from 'lodash';
import { ServiceIssue } from './issue-api/ServiceIssueModels';
import { InvocationContext } from '@azure/functions/types/InvocationContext';

// test cases
// 1: send "Active" issues impacting "Southeast Asia" only
// 2: ignore "Resolved" cases
// 3: send Active issue  impacting "Southeast Asia" only, with new updates
// 4: Ignore Active issues  impacting "Southeast Asia" only, with NO NEW updates

// **Asumption: when service issue reaches this stage, ImpactedServices property will never be empty
// impacted service region will either be Global or SEA
export default class IssueSendStateManager {
    resolvedStatus: string = "Resolved";
    activeStatus: string = "Active";
    context: InvocationContext;

    public async issuesToSendOrMarkResolved(context: InvocationContext, issues: ServiceIssue[]) {

        this.context = context;

        if (_.isEmpty(issues)) {
            return []
        }
    
        const issuesToSend = new Array();
        
        for (const issue of issues) {

            if (_.isEmpty(issue.ImpactedServices)) {
                throw new Error("ImpactedServices is empty at IssueSendStateManager");
            }

            let status ;
            let lastUpdateTime: number;
            let canSend = false;
            
            // issue impacted service in SEA or global
            for (const svc of issue.ImpactedServices ) {

                status = svc.SEARegionOrGlobalStatus;

                //any new update, this region-level lastUpdateTime will also be updated to be the same
                // datetime as latest update
                lastUpdateTime = svc.SEARegionOrGlobalLastUpdateTime.valueOf();

                const canSendResult = await this.canSendIssueOrMarkResolved
                    (new Issue(issue.TenantName, issue.TrackingId, svc.ImpactedService, lastUpdateTime, status));

                // set canSend to true only once and not let subsequent false result to override previous canSend=true
                if (canSendResult && !canSend) {
                    canSend = true;
                }
            };
            

            
            if (canSend) {
                issuesToSend.push(issue);
            }
        }

        return issuesToSend;
    }


    private async canSendIssueOrMarkResolved(issue: Issue) : Promise<boolean> {
        
        const [isExist, existingIssue] = await globalThis.db.issueExist(issue.TrackingId, issue.ImpactedService);

        //is new issue, does not exist in DB
        if (!isExist) {
            this.context.info(`Issue with Tracking Id ${issue.TrackingId} is a new issue, mark for sending`)
            const result = await globalThis.db.addIssue(issue);
            return true;
        }

        // issue exist in DB, check if there is update
        if (issue.ImpactedService == existingIssue.ImpactedService && issue.LastUpdateTime > existingIssue.LastUpdateTime ) {
            this.context.info
                (`
                Issue with Tracking Id ${existingIssue.TrackingId} is an existing issue, with new update at ${new Date(issue.LastUpdateTime )}.
                Previous update was at ${new Date(existingIssue.LastUpdateTime)}} mark for sending.
                `)
            
            await globalThis.db.updateIssueLastUpdateTime(issue);
            return true;
        }

        // mark stored issue Resolved if there is a new issue update that status is Resolved 
        const issueResolved = await this.tryResolveIssue(existingIssue, issue.Status);

        return issueResolved;
        
    }

    private tryResolveIssue(existingIssue: Issue, status: string) {

        if (status == this.resolvedStatus && existingIssue.Status == this.activeStatus) {

            this.context.info(`Issue with Tracking Id ${existingIssue.TrackingId} is Resolved, marking existing tracked issue as Resolved.`);
            
            existingIssue.Status = this.resolvedStatus;
            
            globalThis.db.setIssueResolved(existingIssue);

            return true;
        }

        //this.context.info(`Issue with Tracking Id ${trackingId} is not resolve, marking existing tracked issue as Resolved.`)

        return false;
    }

}