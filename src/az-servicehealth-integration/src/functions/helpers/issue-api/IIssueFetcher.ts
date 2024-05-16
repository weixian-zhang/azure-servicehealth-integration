import {ServiceIssue} from "./ServiceIssueModels";

export default interface IIssueFetcher {
    getIssuesAndImpactedResourcesAtTenantLevel(): Promise<ServiceIssue[]>;
}