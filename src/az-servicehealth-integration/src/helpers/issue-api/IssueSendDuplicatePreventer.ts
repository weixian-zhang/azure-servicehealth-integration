import {DB} from '../DB';
import * as _ from 'lodash';
import { ServiceIssue } from './ServiceIssueModels';
import AppConfig from "../AppConfig";
import { TableClient, TableServiceClient} from "@azure/data-tables"; '@azure/data-table';
import { DefaultAzureCredential } from "@azure/identity";

// **Asumption: when service issue reaches this stage, ImpactedServices property will never be empty
// impacted service region will either be Global or SEA
export default class IssueSendDuplicatePreventer {
    Resolved: string = "Resolved";
    Active: string = "Active";
    db: DB;

    constructor(db: DB) {
        this.db = db;
    }

    async init() {
        await this.db.initDB()
    }

    // ** decision tree to determine if an issue will be sent
    // issue level
        // issue is Resolved and no tracked issue is found in DB
            // do nothing
        // issue is Resolved and tracked issue is also Resolved
            // do nothing
        // issue is Active and no existing tracked issue is found in DB
            // save issue as tracked issue in DB
            // mark-issue-to-send
        // issue status change from Active to Resolved
            // update tracked issue status to Resolved in DB
            // mark-issue-to-send

        // issue / impacted service - SEA region or Global only level
            // if issue / impacted service has newer "lastUpdateTime", means has new update
                // update tracked-impacted-service lastUpdatedTime to lasted updated time
                // mark-issue-to-send
            // if issue / impacted service status change from Active to Resolved
                // update tracked-impacted-service:
                    // set tracked-impacted-service status to Resolved in DB
                    // set tracked-impacted-service lastUpdatedTime to latest updated time in DB
                // mark-issue-to-send
    public async determineShouldSendIssues(issues: ServiceIssue[]): Promise<ServiceIssue[]> {
        

        if (_.isEmpty(issues)) {
            return []
        }

        const issuesToSend = new Array<ServiceIssue>();
    
        for (const issue of issues) {

            const [isTracked, trackedIssue] = await this.db.issueExist(issue.TrackingId);

            //issue not tracked
            if (!isTracked) {

                // issue is Resolved and issue not tracked
                if (issue.OverallStatus == this.Resolved) {
                    continue;
                }

                // issue is Active and no tracked issue is found in DB
                if (issue.OverallStatus == this.Active) {
                    await this.db.addIssue(issue);
                    issuesToSend.push(issue);
                    continue;
                }

            }
            // issue was tracked
            else {
                // issue is Resolved while tracked issue is also Resolved
                if (issue.OverallStatus == this.Resolved && trackedIssue.Status == this.Resolved ) {
                    continue;
                }

                // issue status change from Active to Resolved
                if (issue.OverallStatus == this.Resolved && trackedIssue.Status == this.Active) {
                    await this.db.updateIssueResolved(trackedIssue, issue.LastUpdateTime)
                    issuesToSend.push(issue);
                    continue;
                }

                // Issue is Active and tracked issue is also active
                // check if there are updates to each impacted services
                // *note: each impacted service for each region, can have separate updates
                // ** only focusing at SEA region impacted services only
                if (issue.OverallStatus == this.Active && trackedIssue.Status == this.Active) {

                    const [trackedIssue, trackedImpactedServices] = await this.db.getImpactedServices(issue.TrackingId);

                    // all issue at this point is "tracked", and MUST have SEA region impacted services
                    for (const svc of issue.ImpactedServices ) {

                        const impactedSvc = trackedImpactedServices.get(svc.ImpactedService);


                        // only interested in SEA regional status, other regions are ignored
                        // check if SEA region level status is Resolved, and update tracked issue status to Resolved
                        if (svc.SEARegionOrGlobalStatus == this.Resolved && impactedSvc.Status == this.Active) {
                            await this.db.updateImpactedServiceResolved(trackedIssue, svc.ImpactedService, svc.SEARegionOrGlobalLastUpdateTime);
                            
                            issuesToSend.push(issue);
                        }

                        // impacted service has newer "lastUpdateTime"
                        else if (svc.SEARegionOrGlobalLastUpdateTime.valueOf() > impactedSvc.LastUpdateTime) {
                            globalThis.funcContext.trace
                                (`at IssueSendDuplicatePreventer: 
                                Issue with Tracking Id ${issue.TrackingId} is an existing issue, with new update at ${new Date(issue.LastUpdateTime )}.
                                Previous update was at ${new Date(issue.LastUpdateTime)}}, therefore issue mark for re-sending.
                                `)
                            
                            await this.db.updateImpactedServiceLastUpdateTime(trackedIssue, svc.ImpactedService, svc.SEARegionOrGlobalLastUpdateTime);
                            
                            issuesToSend.push(issue);
                        }
                    }
                }

            }
            
        }

        return issuesToSend;
    }
}