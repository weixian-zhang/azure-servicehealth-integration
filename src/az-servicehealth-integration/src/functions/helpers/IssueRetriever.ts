import IIssueRetriever from "./IIssueRetriever"
import ApiIssueRetriever from "./ApiIssueRetriever";
import MockIssueRetriever from "./MockIssueRetriever";
import ServiceIssue from "../models/ServiceIssue";
import AppConfig from "./AppConfig";
import { InvocationContext, InvocationHookContext } from "@azure/functions";

export class IssueRetriever {

    issueRetriever: IIssueRetriever;
    context: InvocationContext;

    constructor(appconfig: AppConfig, context: InvocationContext) {

        this.context = context;

        const isDevTest = process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST

        if (appconfig.IsDevTest) {
            this.issueRetriever = new MockIssueRetriever();
        }
        else {
            this.issueRetriever = new ApiIssueRetriever(this.context);
        }
    }

    getIssues() : ServiceIssue[] {
        return []
    }

    private getImpactedResources(TrackingId: string) {
        
    }
}