import IIssueRetriever from "./IIssueRetriever"
import ApiIssueRetriever from "./ApiIssueRetriever";
import MockIssueRetriever from "./MockIssueRetriever";
import {ServiceIssue} from "./ServiceIssueModels";
import AppConfig from "./AppConfig";
import { InvocationContext, InvocationHookContext } from "@azure/functions";

export class IssueRetriever {

    issueRetriever: IIssueRetriever;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(appconfig: AppConfig, context: InvocationContext) {

        this.appconfig = appconfig;
        this.context = context;

        const isDevTest = process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST

        if (appconfig.IsDevTest) {
            this.issueRetriever = new MockIssueRetriever();
        }
        else {
            this.issueRetriever = new ApiIssueRetriever(this.appconfig, this.context);
        }
    }

    async getIssues() : Promise<ServiceIssue[]> {
        const issues = await this.issueRetriever.getIssuesAndImpactedResourcesAtTenantLevel();
        return issues
    }

    private getImpactedResources(TrackingId: string) {
        
    }
}