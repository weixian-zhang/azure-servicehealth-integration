import IIssueRetriever from "./IIssueRetriever";
import { ServiceIssue } from "./ServiceIssueModels";
export default class MockIssueRetriever implements IIssueRetriever {
    
    getIssuesAndImpactedResourcesAtTenantLevel(): Promise<ServiceIssue[]> {
        throw new Error("Method not implemented.");
    }
}