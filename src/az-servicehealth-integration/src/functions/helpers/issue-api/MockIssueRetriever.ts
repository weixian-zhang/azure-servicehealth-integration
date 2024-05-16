import IIssueFetcher from "./IIssueFetcher";
import { ServiceIssue } from "./ServiceIssueModels";
export default class MockIssueGenerator implements IIssueFetcher {

    //reuse ApiIssueFetcher and add/edit/remove issue data
    getIssuesAndImpactedResourcesAtTenantLevel(): Promise<ServiceIssue[]> {
        throw new Error("Method not implemented.");
    }
    

}