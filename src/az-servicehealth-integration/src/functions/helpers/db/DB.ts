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
    public impactedService: string;
    public LastUpdateTime: number;//unix epoch
    public Status: string ;       // Active or Resolved

    constructor(tenantName: string, trackingId: string, impactedService: string, lastUpdateTime: number, status: string) {
        this.TenantName = tenantName;
        this.TrackingId = trackingId;
        this.impactedService = impactedService;
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
    private dbPath = process.cwd() + "\\src\\functions\\helpers\\db\\db";

    constructor() {
        this.initDB();
    }

    private async initDB() {
        const defaultData: Data = { issues: [] }
        this.db =  new JsonDB(new Config(this.dbPath, true, true));//await JSONFilePreset('./db.json', defaultData)
    }

    //exist and status is Active
    async issueExist(trackingId: string, impactedService: string) : Promise<[boolean, Issue]> {
        try {

            const dataPath = '/' + trackingId;

            if (this.db.exists(dataPath)) {
                const exist = await this.db.find(dataPath, (issue, index) => {
                    if (issue.impactedService == impactedService) {
                        return true;
                    }
                    return false;
                });
            }

            return [false, null];


        } catch (error) {
            await this.db.reload();
        }
        
    }

    async addOrUpdateIssue(issue: Issue) {
        try {
            const dataPath = '/' + issue.TrackingId;
            this.db.push(dataPath, issue);
            await this.db.save();
        } catch (error) {
            await this.db.reload();
        }
        
        
    }

}