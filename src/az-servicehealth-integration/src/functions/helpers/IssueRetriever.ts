import IIssueRetriever from "./IIssueRetriever"
import ApiIssueRetriever from "./ApiIssueRetriever";
import MockIssueRetriever from "./MockIssueRetriever";
import ServiceIssue from "../models/ServiceIssue";

export class IssueRetriever {

    issueRetriever: IIssueRetriever;

    constructor() {
        const isDevTest = process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST

        if (isDevTest) {
            this.issueRetriever = new MockIssueRetriever()
        }
        else {
            this.issueRetriever = new ApiIssueRetriever()
        }

    }

    getIssues() : ServiceIssue[] {
        return []
    }

    private getImpactedResources(TrackingId: string) {
        
    }
}