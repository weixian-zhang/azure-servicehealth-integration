import * as lowDb from 'lowdb';
import * as FileAsync from 'lowdb/adapters/FileAsync';
import { JSONFilePreset } from 'lowdb/node'
import * as _ from 'lodash';

// status reference
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#eventstatusvalues
export class Issue{
    public TrackingId: string;
    public LastUpdateTime: number;//unix epoch
    public Status: string ;       // Active or Resolved
}

type Data = {
    issues: Issue[]
}

// example
// https://github.com/typicode/lowdb
export class DB {

    private db: lowDb.Low<{issues: Issue[];}>;

    constructor() {
        this.initDB();
    }

    private async initDB() {
        const defaultData: Data = { issues: [] }
        this.db = await JSONFilePreset('db.json', defaultData)

    }

    //exist and status is Active
    issueExist(trackingId: string) : Issue {
        const issue = this.db.data.issues.find((issue) => issue.TrackingId == trackingId && issue.Status == 'Active');
        if (_.isEmpty(issue)) {
            return issue;
        }
        return null;
    }

    addIssue(issue: Issue) {
        this.db.data.issues.push(issue);
        this.db.write();
    }

    updateIssue(issue: Issue){
        this.db.update(() => issue);
        this.db.write();
    }
}