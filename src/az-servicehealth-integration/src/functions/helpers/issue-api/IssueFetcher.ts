import IIssueFetcher from "./IIssueFetcher"
import ApiIssueRetriever from "./ApiIssueFetcher";
import MockIssueRetriever from "./MockIssueFetcher";
import {ServiceIssue} from "./ServiceIssueModels";
import AppConfig from "../AppConfig";
import { InvocationContext, InvocationHookContext } from "@azure/functions";
import { ClientSecretCredential } from "@azure/identity";

export default class IssueFetcher {

    issueFetcher: IIssueFetcher;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(tenantName: string, azcred: ClientSecretCredential, subscriptionId: string, appconfig: AppConfig, context: InvocationContext) {

        this.appconfig = appconfig;
        this.context = context;

        const isDevTest = process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST

        if (appconfig.IsDevTest) {
            this.issueFetcher = new MockIssueRetriever();
        }
        else {
            this.issueFetcher = new ApiIssueRetriever(tenantName, azcred,subscriptionId, this.appconfig, this.context);
        }
    }

    async getIssues() : Promise<ServiceIssue[]> {
        const issues = await this.issueFetcher.getIssuesAndImpactedResourcesAtTenantLevel();
        return issues
    }

    private getImpactedResources(TrackingId: string) {
        
    }
}