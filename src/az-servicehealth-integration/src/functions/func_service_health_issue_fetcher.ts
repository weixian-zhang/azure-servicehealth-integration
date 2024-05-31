import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "./helpers/AppConfig";
import { ClientSecretCredential   } from "@azure/identity"
import { DB } from "./helpers/db/DB";
import * as _ from 'lodash';
import SendIssueWorkflowManager from "./helpers/SendIssueWorkflowManager";

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
    var db: DB;
    var wogTenantName: string;
    var techpassTenantName: string;
}

class QueueData {
    incidentStartFromDate: string
}

const queueConnStringEnvName = 'AZURE_STORAGE_CONNECTION_STRING';


export async function func_service_health_issue_fetcher(data: QueueData, context: InvocationContext): Promise<HttpResponseInit> {

    try {

        
        initGlobalAppConfig(data.incidentStartFromDate);

        const wfm = new SendIssueWorkflowManager(context, globalThis.appconfig);

        const result = await wfm.generateIssueReport();

    }
    catch(e){
        
        // if app insights is enabled at function, will log to app insights.Traces
        context.error(e.message)

        return {
            status: 500,
            body: e.message
        };
    }
    
};


function initGlobalAppConfig(incidentStartFromDate: string) {

    globalThis.db = new DB();
    globalThis.wogTenantName = "WOG";
    globalThis.techpassTenantName = "TechPass";
    
    globalThis.appconfig = AppConfig.loadFromEnvVar(incidentStartFromDate);
}


app.storageQueue('func_service_health_issue_fetcher', {
    queueName: 'incident-fetcher-in',
    connection: queueConnStringEnvName,
    handler: func_service_health_issue_fetcher
});
