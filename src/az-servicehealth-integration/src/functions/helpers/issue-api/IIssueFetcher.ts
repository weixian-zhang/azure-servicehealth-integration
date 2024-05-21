import {ServiceIssue} from "./ServiceIssueModels";

export default interface IIssueFetcher {
    fetchIssuesAndImpactedResources(): Promise<ServiceIssue[]>;
}