// import Lowdb from 'lowdb';
// import { JSONFilePreset } from 'lowdb/adapters/FileAsync'
// import Lowdb from 'lowdb';
// import { } from 'lowdb/adapters/FileSync'
import { JsonDB, Config, FindCallback } from 'node-json-db';
import * as _ from 'lodash';

// status reference
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#eventstatusvalues
export class Issue{
    public TenantName: string;
    public TrackingId: string;
    public LastUpdateTime: number;//unix epoch
    public Status: string ;       // Active or Resolved

    constructor(tenantName: string, trackingId: string, lastUpdateTime: number, status: string) {
        this.TenantName = tenantName;
        this.TrackingId = trackingId;
        this.LastUpdateTime = lastUpdateTime;
        this.Status = status;
    }
}

type Data = {
    issues: Issue[]
}

// example
// https://github.com/typicode/lowdb
export class DB {

    private db: JsonDB; //Low<{issues: Issue[];}>;

    constructor() {
        this.initDB();
    }

    private async initDB() {
        const defaultData: Data = { issues: [] }
        this.db =  new JsonDB(new Config("db", true, true));//await JSONFilePreset('./db.json', defaultData)
    }

    //exist and status is Active
    async issueExist(trackingId: string) : Promise<[boolean, Issue]> {
        try {

            const dataPath = '/' + trackingId;

            const exist = await this.db.exists(dataPath);

            // const issue = this.db.data.issues.find((issue) => issue.TrackingId == trackingId && issue.Status == 'Active');
            if (exist) {
                const issueStr = await this.db.getObject<string>(dataPath);
                const existinIssue = JSON.parse(issueStr) as Issue;
                return [true, existinIssue];
            }
            return [false, null];

        } catch (error) {
            await this.db.reload();
        }
        
    }

    async addOrUpdateIssue(issue: Issue) {
        try {
            const dataPath = '/' + issue.TrackingId;
            this.db.push(dataPath, JSON.stringify(issue))
            await this.db.save();
        } catch (error) {
            await this.db.reload();
        }
        
        
    }

}