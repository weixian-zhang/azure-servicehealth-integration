import IIssueFetcher from "./IIssueFetcher"
import ApiIssueRetriever from "./ApiIssueFetcher";
import MockIssueRetriever from "./MockIssueFetcher";
import {ServiceIssue, Subscription} from "./ServiceIssueModels";
import AppConfig from "../AppConfig";
import { InvocationContext } from "@azure/functions";
import { ClientSecretCredential } from "@azure/identity";

export default class IssueFetcher {

    issueFetcher: IIssueFetcher;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(tenantName: string, azcred: ClientSecretCredential, subscriptions: Subscription[], appconfig: AppConfig, context: InvocationContext) {

        this.appconfig = appconfig;
        this.context = context;

        const isDevTest = process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST

        if (appconfig.IsDevTest) {
            this.issueFetcher = new MockIssueRetriever();
        }
        else {
            this.issueFetcher = new ApiIssueRetriever(tenantName, azcred, subscriptions, this.appconfig, this.context);
        }
    }

    async getIssues() : Promise<ServiceIssue[]> {
        const issues = await this.issueFetcher.fetchIssuesAndImpactedResources();
        return issues
    }

    private getImpactedResources(TrackingId: string) {
        
    }
}