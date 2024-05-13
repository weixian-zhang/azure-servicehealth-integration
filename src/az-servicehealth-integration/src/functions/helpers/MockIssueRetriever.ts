import IIssueRetriever from "./IIssueRetriever";

export default class MockIssueRetriever implements IIssueRetriever {
    
    getIssuesAndImpactedResourcesAtTenantLevel() {
        throw new Error("Method not implemented.");
    }
}