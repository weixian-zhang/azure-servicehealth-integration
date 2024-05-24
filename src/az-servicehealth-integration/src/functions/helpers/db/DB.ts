import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite'
import * as _ from 'lodash';
import { ImpactedService, ServiceIssue } from '../issue-api/ServiceIssueModels';

// status reference
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#eventstatusvalues
export class TrackedIssue{
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

export class TrackedImpactedService {
    LastUpdateTime: number;
    Status: string
    constructor(lastUpdateTime: number, status: string) {
        this.LastUpdateTime = lastUpdateTime;
        this.Status = status;
    }
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

        const createTableIssue = `
            CREATE TABLE IF NOT EXISTS Issue (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Tenant_Name TEXT NOT NULL,
                Tracking_Id TEXT NOT NULL,
                LastUpdateTime INTEGER NOT NULL,
                Status TEXT NOT NULL
            );
        `;

        const createTableImpactedService = `
            
            CREATE TABLE IF NOT EXISTS Impacted_Service (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                TrackingId TEXT NOT NULL,
                ImpactedService TEXT NOT NULL,
                LastUpdateTime INTEGER NOT NULL,
                Status TEXT NOT NULL
            );
        `;
        
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        
        await this.db.run(createTableIssue);

        await this.db.run(createTableImpactedService);
    }

    async issueExist(trackingId: string) : Promise<[boolean, TrackedIssue]> {
        try {

            const existingIssue = await this.db.get(`
                SELECT 
                    TenantName,
                    TrackingId,
                    LastUpdateTime,
                    Status 
                FROM Issue
                WHERE TrackingId = '${trackingId}';
            `);

            if (!_.isEmpty(existingIssue)) {
                return [true, existingIssue];
            }

            return [false, null];


        } catch (error) {
            throw new Error(`Error at DB.issueExist: ${error.message}`);
        }
    }

    async getImpactedServices(trackingId: string) : Promise<Map<string, TrackedImpactedService>> {
        try {

            const impactedServices: TrackedIssue[] = await this.db.all(`
                SELECT 
                    ImpactedService,
                    LastUpdateTime,
                    Status 
                FROM Impacted_Service
                WHERE TrackingId = '${trackingId}';
            `);

            if (!_.isEmpty(impactedServices)) {

                const map = new Map<string, TrackedImpactedService>();
                impactedServices.forEach(isvc => {
                    map.set(isvc.ImpactedService, new TrackedImpactedService(isvc.LastUpdateTime, isvc.Status))
                });

                return map;
            }

            return new Map<string, TrackedImpactedService>;


        } catch (error) {
            throw new Error(`Error at DB.issueExist: ${error.message}`);
        }
    }



    //exist and status is Active
    // async getImpactedServiceLastUpdateTime(trackingId: string) : Promise<[boolean, number[]]> {
    //     try {

    //         const serviceLastUpdateTimes = await this.db.get(`
    //             SELECT ImpactedService, LastUpdateTime FROM Impacted_Service
    //             WHERE TrackingId = '${trackingId}';`);

    //         if (!_.isEmpty(serviceLastUpdateTimes)) {
    //             return [true, serviceLastUpdateTimes];
    //         }

    //         return [false, []];


    //     } catch (error) {
    //         throw new Error(`Error at DB.issueExist: ${error.message}`);
    //     } 
    // }

    // async getImpactedServiceStatus(trackingId: string, impactedService: string) : Promise<[boolean, Issue]> {
    //     try {

    //         const existingIssue = await this.db.get(`
    //             SELECT ImpactedService, Status 
    //             FROM Impacted_Service WHERE TrackingId = '${trackingId}' AND ImpactedService = '${impactedService}' `);

    //         if (!_.isEmpty(existingIssue)) {
    //             return [true, existingIssue];
    //         }

    //         return [false, null];


    //     } catch (error) {
    //         throw new Error(`Error at DB.issueExist: ${error.message}`);
    //     } 
    // }

    async addIssue(issue: ServiceIssue) {
        try {

                // save impacted services
                for (const isvc of issue.ImpactedServices) {
                    await this.db.run(`
                        INSERT INTO Impacted_Service (
                            TrackingId,
                            ImpactedService,
                            LastUpdateTime,
                            Status
                        )
                        VALUES(
                            '${issue.TrackingId}',
                            '${isvc.ImpactedService}',
                            '${isvc.SEARegionOrGlobalLastUpdateTime.valueOf()}',
                            '${isvc.SEARegionOrGlobalStatus}'
                        )`
                    );
                };

                await this.db.run(`
                    INSERT INTO Issue (
                        TenantName,
                        TrackingId,
                        LastUpdateTime,
                        Status
                    )
                    VALUES(
                        '${issue.TenantName}',
                        '${issue.TrackingId}',
                        '${issue.LastUpdateTime.valueOf()}',
                        '${issue.OverallStatus}'
                    )`
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    async updateIssueResolved(trackingId: string, lastUpdatedTime: Date) {
        
        try {
                await this.db.run(`
                    UPDATE Issue
                    SET
                        Status = 'Resolved',
                        LastUpdateTime = ${lastUpdatedTime.valueOf()}
                    WHERE TrackingId = '${trackingId}';
                `
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    // explicitly add update function for LastUpdateTime and Status to highlight importance of 
    // Last-Update-Time changes when new updates get added and Status change from Active to Resolved
    // App use LastUpdateTime and Status at SEA region level, to decide whether or not to send out an issue again
    async updateImpactedServiceLastUpdateTime(trackingId: string, impactedService: string, lastUpdatedTime: Date) {
        
        try {
                await this.db.run(`
                    UPDATE Impacted_Service
                    SET LastUpdateTime = ${lastUpdatedTime.valueOf()}
                    WHERE TrackingId = '${trackingId}' AND ImpactedService = '${impactedService}'
                `
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    async updateImpactedServiceResolved(trackingId: string, impactedService: string, lastUpdatedTime: Date) {

        try {
                await this.db.run(`
                    UPDATE Impacted_Service
                    SET 
                        Status = 'Resolved',
                        LastUpdateTime = ${lastUpdatedTime.valueOf()}
                    WHERE TrackingId = '${trackingId}' AND ImpactedService = '${impactedService}'
                `
                );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }
}