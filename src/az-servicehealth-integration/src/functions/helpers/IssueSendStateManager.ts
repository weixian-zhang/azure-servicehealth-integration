import {DB, Issue} from './db/DB';
import * as _ from 'lodash';
import { ServiceIssue } from './issue-api/ServiceIssueModels';

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

    public async issuesToSendOrMarkResolved(issues: ServiceIssue[]) {
        
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
            
            // issue impacted service in SEA or global
            issue.ImpactedServices.forEach( (svc) => {
                status = svc.SEARegionOrGlobalStatus;
                lastUpdateTime = svc.SEARegionOrGlobalLastUpdateTime.valueOf()
            });
            

            const canSend = await this.canSendIssueOrMarkResolved
                (issue.TenantName, issue.TrackingId, lastUpdateTime, status);


            if (canSend) {
                issuesToSend.push(issue);
            }
        }

        return issuesToSend;
    }


    private async canSendIssueOrMarkResolved
        (tenantName:string, trackingId: string, lastUpdateTime: number, status: string) : Promise<boolean> {
        
        const [isExist, existingIssue] = await globalThis.db.issueExist(trackingId);

        //is new issue, does not exist in DB
        if (!isExist) {
            globalThis.db.addOrUpdateIssue(new Issue(tenantName, trackingId, lastUpdateTime, status))
            return true;
        }

        // issue exist in DB, check if there is update
        if (lastUpdateTime > existingIssue.LastUpdateTime ) {
            globalThis.db.addOrUpdateIssue(new Issue(tenantName, trackingId, lastUpdateTime, status))
            return true;
        }

        // mark stored issue Resolved if there is a new issue update that status is Resolved 
        const issueResolved = this.tryResolveIssue(existingIssue, trackingId, status);

        return issueResolved;
        
    }

    private tryResolveIssue(existingIssue: Issue, trackingId: string, status: string) {

        if (status == this.resolvedStatus && existingIssue.Status == this.activeStatus) {
            
            existingIssue.Status = this.resolvedStatus;
            
            globalThis.db.addOrUpdateIssue(existingIssue);

            return true;
        }

        return false;
    }
}