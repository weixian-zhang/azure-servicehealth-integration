import FetcherHelper from "./FetcherHelper";
import IIssueFetcher from "./IIssueFetcher";
import { ServiceIssue } from "./ServiceIssueModels";
import * as fs from 'fs';

export default class MockIssueGenerator implements IIssueFetcher {
    wogTenantName = "WOG";
    techpassTenantName = "TechPass";
    dataPath: string = "src/functions/helpers/issue-api/mock-data/listBySubscriptionId.json";

    //reuse ApiIssueFetcher and add/edit/remove issue data
    async getIssuesAndImpactedResourcesAtTenantLevel(): Promise<ServiceIssue[]> {

        const data = await fs.promises.readFile(this.dataPath, "utf8");

        let issues = JSON.parse(data) as any[];
        issues = issues['value'];
        
        let curr: number = 0;
        const numOfIssuesToReturn: number = 1;
        const result = new Array<ServiceIssue>();

        issues.forEach((issue, index) => {

            issue.properties.status = "Active";

            if (curr == numOfIssuesToReturn) {
                return Promise.resolve(result);
            }

            const [hasIssue, serviceIssue] = FetcherHelper.createServiceIssue(this.wogTenantName, issue);

            if (hasIssue) {
                result.push(serviceIssue);
            }

            curr++;
        });

        return Promise.resolve(result);
    }
    

}