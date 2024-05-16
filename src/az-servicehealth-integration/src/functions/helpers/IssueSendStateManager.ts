import {DB, Issue} from './db/DB';
import * as _ from 'lodash';
import { ServiceIssue } from './issue-api/ServiceIssueModels';

export default class IssueSendStateManager {
    resolvedStatus: string = "Resolved";
    activeStatus: string = "Active";

    public async issuesToSendOrMarkResolved(issues: ServiceIssue[]) {
        
        if (_.isEmpty(issues)) {
            return []
        }
    
        const issuesToSend = new Array();
        
        for (const issue of issues) {
            
            const canSend =
                await this.canSendIssueOrMarkResolved(issue.TenantName, issue.TrackingId, issue.LastUpdateTimeEpoch, issue.Status);

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
        this.tryResolveIssue(existingIssue, trackingId, status);

        return false;
        
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