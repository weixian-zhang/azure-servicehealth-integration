import {ServiceIssue} from "./ServiceIssueModels";

export default interface IIssueRetriever {
    getIssuesAndImpactedResourcesAtTenantLevel(): Promise<ServiceIssue[]>;
}