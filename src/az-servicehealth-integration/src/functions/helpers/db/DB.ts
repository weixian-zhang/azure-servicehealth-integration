import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite'
import * as _ from 'lodash';

// status reference
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#eventstatusvalues
export class Issue{
    public TenantName: string;
    public TrackingId: string;
    public ImpactedService: string;
    public LastUpdateTime: number;//unix epoch
    public Status: string ;       // Active or Resolved

    constructor(tenantName: string, trackingId: string, impactedService: string, lastUpdateTime: number, status: string) {
        this.TenantName = tenantName;
        this.TrackingId = trackingId;
        this.ImpactedService = impactedService;
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

    private db: Database; //Low<{issues: Issue[];}>;
    private dbPath = process.cwd() + "\\src\\functions\\helpers\\db\\db.sqlite";

    constructor() {
        this.initDB();
    }

    private async initDB() {
        const defaultData: Data = { issues: [] }
        const createTableTSQL = `
        CREATE TABLE IF NOT EXISTS Issue_History (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            TenantName TEXT NOT NULL,
            TrackingId TEXT NOT NULL,
            ImpactedService TEXT NOT NULL,
            LastUpdateTime INTEGER NOT NULL,
            Status TEXT NOT NULL
        )
        `;
        
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });

        await this.db.run(createTableTSQL);

    }



    //exist and status is Active
    async issueExist(trackingId: string, impactedService: string) : Promise<[boolean, Issue]> {
        try {

            const dataPath = '/' + trackingId;

            const existingIssue = await this.db.get(`SELECT * FROM Issue_History WHERE TrackingId = '${trackingId}' AND ImpactedService = '${impactedService}' `);

            if (!_.isEmpty(existingIssue)) {
                return [true, existingIssue];
            }

            return [false, null];


        } catch (error) {
            throw new Error(`Error at DB.issueExist: ${error.message}`);
        }
        
    }

    async addIssue(issue: Issue) {
        try {
                const result = await this.db.run(`
                    INSERT INTO Issue_History (
                        TenantName,
                        TrackingId,
                        ImpactedService,
                        LastUpdateTime,
                        Status
                    )
                    VALUES(
                        '${issue.TenantName}',
                        '${issue.TrackingId}',
                        '${issue.ImpactedService}',
                        '${issue.LastUpdateTime}',
                        '${issue.Status}'
                    )`
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    // explicitly add update function for LastUpdateTime and Status to highlight importance of 
    // Last-Update-Time changes when new updates get added and Status change from Active to Resolved
    // App use LastUpdateTime and Status to decide whether or not to send out an issue again
    async updateIssueLastUpdateTime(issue: Issue) {
        
        try {
                await this.db.run(`
                    UPDATE Issue_History
                    SET LastUpdateTime = '${issue.LastUpdateTime}'
                    WHERE TrackingId = '${issue.TrackingId}' AND ImpactedService = '${issue.ImpactedService}'
                `
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    async setIssueResolved(issue: Issue) {

        try {
                await this.db.run(`
                    UPDATE Issue_History
                    SET Status = '${issue.Status}'
                    WHERE TrackingId = '${issue.TrackingId}' AND ImpactedService = '${issue.ImpactedService}'
                `
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }

    }

}