import ServiceIssue from "../models/ServiceIssue";
import IIssueRetriever from "./IIssueRetriever";
import { ClientSecretCredential, DefaultAzureCredential, OnBehalfOfCredential   } from "@azure/identity"
import { MicrosoftResourceHealth } from "@azure/arm-resourcehealth"
import { ArrayHelper } from "./HelperFuncs";
import ImpactedResource from "../models/ImpactedResource";
import { InvocationContext } from "@azure/functions";

//service issu json schema
//https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-tenant-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#listeventsbytenantid

// impacted resources
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-tenant-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP

export default class ApiIssueRetriever implements IIssueRetriever {
    resourceHealthClient : MicrosoftResourceHealth;
    context: InvocationContext;

    constructor(context: InvocationContext) {
        this.context = context;
        this.resourceHealthClient = new MicrosoftResourceHealth(new DefaultAzureCredential());
    }
    
    async getIssuesAndImpactedResourcesAtTenantLevel() : Promise<ServiceIssue[]> {
        
        try {
            
            let serviceIssues = await this.getServiceIssues();


            if (ArrayHelper.isEmpty(serviceIssues)) {
                return []
            }

            serviceIssues = await this.forEachIssueIncludeImpactedResources(serviceIssues);

            return serviceIssues
        
        } catch (e) {
            this.context.error(e.message);
            throw e;
        }

    }

    private async getServiceIssues() : Promise<ServiceIssue[]> {

        const tempResult = new Array();
        let serviceIssues = new Array();

        const iterator = this.resourceHealthClient.eventsOperations.listByTenantId(null)
        let next;

        while ((next = await iterator.next()).done === false) {
            const issue = next.value

            if (issue) {
                tempResult.push(JSON.parse(issue));
            }
        }

        if (ArrayHelper.isEmpty(tempResult)) {
            return []
        }

        tempResult.forEach(issue => {

            // only need service issue
            if (issue.properties.eventType != 'ServiceIssue') {
                return;
            }

            let si = new ServiceIssue();
            si.TrackingId = issue.name
            si.Status = issue.properties.status
            si.Title = issue.properties.title
            si.Summary = issue.properties.summary
            si.ArticleContent = issue.properties.article.articleContent

            serviceIssues.push(si);
        });

        return serviceIssues
    }

    private async forEachIssueIncludeImpactedResources(issues: ServiceIssue[]) : Promise<ServiceIssue[]> {
        
        if (ArrayHelper.isEmpty(issues)) {
            return []
        }

        let result = new Array();

        issues.forEach(async issue => {
        
            const iterator = this.resourceHealthClient.impactedResources.listByTenantIdAndEventId(issue.TrackingId);
            let next;;

            while ((next = await iterator.next()).done === false) {

                const ip = next.value;

                if (ip) {
                    result.push(JSON.parse(ip));
                }
            }

        });

        return result;
    }



}