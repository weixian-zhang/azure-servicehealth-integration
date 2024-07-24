import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "../helpers/AppConfig";
import { ClientSecretCredential   } from "@azure/identity"
import { DB } from "../helpers/db/DB";
import * as _ from 'lodash';
import SendIssueWorkflowManager from "../helpers/SendIssueWorkflowManager";

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
    var wogTenantName: string;
    var techpassTenantName: string;
    var funcContext: InvocationContext;
}

class QueueData {
    incidentStartFromDate: string
}

const queueConnStringEnvName = 'AzureWebJobsStorage';

//https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/monitor/monitor-opentelemetry-exporter/samples/v1-beta/typescript/src/basicTracerNode.ts
//https://opentelemetry.io/docs/languages/js/exporters/
//https://nitin-rohidas.medium.com/using-custom-span-attributes-in-opentelemetry-21e1ac33ec4c


// multiple function example
// https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=typescript%2Cwindows%2Cazure-cli&pivots=nodejs-model-v4#folder-structure
// https://github.com/Azure-Samples/azure-functions-nodejs-stream/tree/main/src
export async function func_service_health_issue_fetcher(data: QueueData, context: InvocationContext): Promise<HttpResponseInit> {

    try {

        context.info(`At ${new Date}, func_service_health_issue_fetcher received queue data to fetch incidents if any`);

        globalThis.funcContext = context;
        
        initGlobalVariables(data.incidentStartFromDate);

        const wfm = new SendIssueWorkflowManager(context, globalThis.appconfig);

        await wfm.generateIssueReport();

        context.info(`At ${new Date}, func_service_health_issue_fetcher completed task`);
    }
    catch(e){
        
        // if app insights is enabled at function, will log to app insights.Traces
        context.error(`error message: ${e.message},
        ${e.stack}
        `)

        return {
            status: 500,
            body: e.message
        };
    }
    
};


function initGlobalVariables(incidentStartFromDate: string) {
    globalThis.wogTenantName = "WOG";
    globalThis.techpassTenantName = "TechPass";
    globalThis.appconfig = AppConfig.loadFromEnvVar();
    globalThis.appconfig.incidentQueryStartFromDate = incidentStartFromDate
}
// https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-javascript#identity-based-connections
//https://stackoverflow.com/questions/77893774/python-azure-functions-identity-based-connection-for-trigger-bindings
//https://stackoverflow.com/questions/75930046/how-to-run-azure-function-locally-using-user-assigned-managed-identity-configura

app.storageQueue('func_service_health_issue_fetcher', {
    queueName: 'incident-fetcher-in',
    connection: 'StorageQueueIdentityAuth',
    handler: func_service_health_issue_fetcher
});
