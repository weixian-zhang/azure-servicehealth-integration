import { ServiceIssue, ImpactedService, ImpactUpdates, ImpactedResource } from "./ServiceIssueModels";
import IIssueFetcher from "./IIssueFetcher";
import { ClientSecretCredential  } from "@azure/identity"
import { MicrosoftResourceHealth, EventsListByTenantIdOptionalParams, EventsListBySubscriptionIdOptionalParams } from "@azure/arm-resourcehealth"
import { InvocationContext } from "@azure/functions";
import AppConfig from "../AppConfig";
import * as _ from 'lodash';
import FetcherHelper from "./FetcherHelper";

//service issue json schema
//https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-tenant-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP#listeventsbytenantid

// static token credential
// https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-with-a-pre-fetched-access-token

// impacted resources
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/impacted-resources/list-by-tenant-id-and-event-id?view=rest-resourcehealth-2022-10-01&tabs=HTTP

// sample codes
// https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/eventsListByTenantIdSample.ts

export default class ApiIssueFetcher implements IIssueFetcher {
    appconfig: AppConfig;
    resourceHealthClient : MicrosoftResourceHealth;
    context: InvocationContext;
    regionToFilter = "Southeast Asia";
    tenantName: string;

    constructor(tenantName: string, azcred: ClientSecretCredential, subscriptionId: string, appconfig: AppConfig, context: InvocationContext) {
        this.tenantName = tenantName;
        this.appconfig = appconfig;
        this.context = context;
        this.resourceHealthClient = new MicrosoftResourceHealth(azcred, subscriptionId);
    }
    

    async getIssuesAndImpactedResourcesAtTenantLevel() : Promise<ServiceIssue[]> {
        
        try {
            
            let serviceIssues = await this.getServiceIssues();


            if (_.isEmpty(serviceIssues)) {
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

        let serviceIssues = new Array();

        const filter = "region eq 'Southeast Asia'";
        const queryStartTime = this.appconfig.incidentQueryStartFromDate;
        // const options: EventsListByTenantIdOptionalParams = {
        //     queryStartTime
        // };
        const options: EventsListBySubscriptionIdOptionalParams = {
            queryStartTime
        };

        // const iterator = this.resourceHealthClient.eventsOperations.listByTenantId(null)
        // let next;

        for await (let issue of this.resourceHealthClient.eventsOperations.listBySubscriptionId(options)) { //this.resourceHealthClient.eventsOperations.listByTenantId()) {

            const [hasIssue, serviceIssue] = FetcherHelper.createServiceIssue(this.tenantName, issue);

            // only include an issue when there is one or more SEA region impacted services 
            if (hasIssue && !_.isEmpty(serviceIssue.ImpactedServices)) {
                serviceIssues.push(serviceIssue);
            }

        }


        serviceIssues = await this.forEachIssueIncludeImpactedResources(serviceIssues)


        return serviceIssues
    }

    // sample code
    // https://github.com/Azure/azure-sdk-for-js/blob/%40azure/arm-resourcehealth_4.0.0/sdk/resourcehealth/arm-resourcehealth/samples/v4/typescript/src/impactedResourcesListByTenantIdAndEventIdSample.ts
    private async forEachIssueIncludeImpactedResources(issues: ServiceIssue[]) : Promise<ServiceIssue[]> {
        
        if (_.isEmpty(issues)) {
            return [];
        }

        let result = new Array();

        issues.forEach(async issue => {
        
            for await (let resource of this.resourceHealthClient.impactedResources.listBySubscriptionIdAndEventId(issue.TrackingId)) {//this.resourceHealthClient.impactedResources.listByTenantIdAndEventId(issue.TrackingId)) {

                const ir = new ImpactedResource();
                const rscArr = resource.targetResourceId.split("/");
                ir.SubscriptionId =  (rscArr[1]) ? rscArr[1] : "";
                ir.ResourceGroup = resource.resourceGroup;
                ir.ResourceType = resource.targetResourceType;
                ir.ResourceName =  resource.resourceName;
                
                issue.ImpactedResources.push(ir);
            }

        });

        return issues;
    }



}