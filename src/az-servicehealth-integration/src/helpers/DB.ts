import { TableClient, TableServiceClient, TableEntity} from "@azure/data-tables"; '@azure/data-table';
import { DefaultAzureCredential } from "@azure/identity";
import * as _ from 'lodash';
import { ServiceIssue } from './issue-api/ServiceIssueModels';
import { url } from "inspector";

// status reference
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#eventstatusvalues
export class TrackedIssue {

    public TenantName: string;
    public TrackingId: string;
    public ImpactedServices: TrackedImpactedService[];
    public LastUpdateTimeEpoch: number;//unix epoch
    public Status: string ;       // Active or Resolved

    constructor(tenantName: string, trackingId: string, impactedServices: TrackedImpactedService[], lastUpdateTime: number, status: string) {
        this.TenantName = tenantName;
        this.TrackingId = trackingId;
        this.ImpactedServices = impactedServices;
        this.LastUpdateTimeEpoch = lastUpdateTime;
        this.Status = status;
    }
}

export class TrackedImpactedService {
    Name: string;
    LastUpdateTime: number;
    Status: string
    constructor(name: string, lastUpdateTime: number, status: string) {
        this.Name = name;
        this.LastUpdateTime = lastUpdateTime;
        this.Status = status;
    }
}

// example
// https://github.com/typicode/lowdb
export class DB {

    private tableClient: TableClient;

    constructor() {

    }

    public async initDB() {

        const tableName = 'Issue';
        const tableEndpoint = `${process.env.AZURE_STORAGETABLE_RESOURCEENDPOINT}`;
        const credential = new DefaultAzureCredential();

        const tableService = new TableServiceClient(
            tableEndpoint,
            credential
            );
        
        // creates table if not exist
        await tableService.createTable(tableName);
        
        this.tableClient = new TableClient(tableEndpoint, tableName, credential);
    }

    async issueExist(trackingId: string) : Promise<[boolean, TrackedIssue]> {
        try {

            const entity: any = await this.tableClient.getEntity(trackingId, "");

            const issue = JSON.parse(entity.issue)

            return [true, issue];

        } catch (error) {
            if (!_.isNil(error.statusCode) && error.statusCode == 404) {
                return [false, null];
            }
            throw new Error(`Error at DB.issueExist: ${error.message}`);
        }
    }

    async getImpactedServices(trackingId: string) : Promise<[TrackedIssue, Map<string, TrackedImpactedService>]> {
        try {
            
            const [exist, issue] = await this.issueExist(trackingId);

            if (!exist) {
                return [null, new Map<string, TrackedImpactedService>()];
            }

            const map = new Map<string, TrackedImpactedService>();

            issue.ImpactedServices.forEach((is) => {
                map.set(is.Name,  is)
            });

            return [issue, map];

        } catch (error) {
            throw new Error(`Error at DB.issueExist: ${error.message}`);
        }
    }


    async addIssue(si: ServiceIssue) {
        try {

                const impactedServices = [];

                for (const isvc of si.ImpactedServices) {

                    const is = new TrackedImpactedService(
                        isvc.ImpactedService,
                        isvc.SEARegionOrGlobalLastUpdateTime.valueOf(), 
                        isvc.SEARegionOrGlobalStatus);

                    impactedServices.push(is);

                };

                const ti = new TrackedIssue(
                    si.TenantName, 
                    si.TrackingId, 
                    impactedServices, 
                    si.LastUpdateTime.valueOf(),
                    si.OverallStatus);

                const tij = JSON.stringify(ti)

                const resp = await this.tableClient.upsertEntity({
                    partitionKey: si.TrackingId,
                    rowKey: '',
                    issue: tij
                }, "Replace")


        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    async updateIssueResolved(trackedIssue: TrackedIssue, lastUpdatedTime: Date) {
        
        try {
                trackedIssue.Status= 'Resolved';
                trackedIssue.LastUpdateTimeEpoch = lastUpdatedTime.valueOf();

                const ij = JSON.stringify(trackedIssue)

                await this.tableClient.upsertEntity({
                    partitionKey: trackedIssue.TrackingId,
                    rowKey: '',
                    issue: ij
                }, 'Replace')

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    // explicitly add update function for LastUpdateTime and Status to highlight importance of 
    // Last-Update-Time changes when new updates get added and Status change from Active to Resolved
    // App use LastUpdateTime and Status at SEA region level, to decide whether or not to send out an issue again
    async updateImpactedServiceLastUpdateTime(issue: TrackedIssue, impactedService: string, lastUpdatedTime: Date) {
        
        try {
                //const issue: TrackedIssue = await this.tableClient.getEntity(trackingId, "");

                for(const is of issue.ImpactedServices) {
                    if (is.Name == impactedService) {
                        is.LastUpdateTime = lastUpdatedTime.valueOf();
                        break;
                    }
                }

                const ij = JSON.stringify(issue)

                await this.tableClient.upsertEntity({
                    partitionKey: issue.TrackingId,
                    rowKey: '',
                    issue: ij
                }, 'Replace')

                // await this.db.run(`
                //     UPDATE Impacted_Service
                //     SET LastUpdateTime = ${lastUpdatedTime.valueOf()}
                //     WHERE TrackingId = '${trackingId}' AND ImpactedService = '${impactedService}'
                // `
                // );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }

    async updateImpactedServiceResolved(issue: TrackedIssue, impactedService: string, lastUpdatedTime: Date) {

        try {
                //const issue: TrackedIssue = await this.tableClient.getEntity(trackingId, "");

                for(const is of issue.ImpactedServices) {
                    if (is.Name == impactedService) {
                        is.Status = 'Resolved'
                        is.LastUpdateTime = lastUpdatedTime.valueOf();
                        break;
                    }
                }

                const ij = JSON.stringify(issue)

                await this.tableClient.upsertEntity({
                    partitionKey: issue.TrackingId,
                    rowKey: '',
                    issue: ij
                }, 'Replace')

                // await this.db.run(`
                //     UPDATE Impacted_Service
                //     SET 
                //         Status = 'Resolved',
                //         LastUpdateTime = ${lastUpdatedTime.valueOf()}
                //     WHERE TrackingId = '${trackingId}' AND ImpactedService = '${impactedService}'
                // `
                // );

        } catch (error) {
            throw new Error(`Error at DB.addIssue: ${error.message}`);
        }
    }
}