import {DB, Issue} from './db/DB';
import * as _ from 'lodash';

export default class IssueDeliveryManager {
    resolvedStatus: string = "Resolved";
    activeStatus: string = "Active";

    sendIssueOrMarkResolved(trackingId: string, lastUpdateTime: number) : boolean {
        
        const existingIssue = globalThis.db.issueExist(trackingId);

        if (_.isEmpty(existingIssue)) {
            return true;
        }

        // existing issue
        // is there update
        if (lastUpdateTime > existingIssue.LastUpdateTime ) {
            return true;
        }

        return false;
        
    }

    resolveIssue(existingIssue: Issue, trackingId: string, status: string) {
        if (status == this.resolvedStatus && existingIssue.Status == this.activeStatus) {
            
            existingIssue.Status = this.resolveIssue;
            
            globalThis.db.updateIssue(existingIssue);

            return true;
        }

        return false;
    }
}