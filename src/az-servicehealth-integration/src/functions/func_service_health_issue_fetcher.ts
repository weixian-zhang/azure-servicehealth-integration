import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "../helpers/AppConfig";
import { ClientSecretCredential   } from "@azure/identity"
import { DB } from "../helpers/DB";
import * as _ from 'lodash';
import IssueReportGenerationWorkflow from "../helpers/IssueReportGenerationWorkflow";

declare global {
    var appconfig: AppConfig;
    // var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
    // var wogTenantName: string;
    var techpassTenantName: string;
    var funcContext: InvocationContext;
}

class QueueData {
    incidentStartFromDate: string
}

const queueConnStringEnvName = 'AzureWebJobsStorage';


export async function func_service_health_issue_fetcher(data: QueueData, context: InvocationContext): Promise<HttpResponseInit> {

    try {

        globalThis.funcContext = context;

        globalThis.funcContext.trace(`techpass / issue_fetcher: received message with incidentStartFromDate ${data.incidentStartFromDate}, start fetching issues`);
        
        initGlobalVariables(context, data.incidentStartFromDate);

        const wfm = new IssueReportGenerationWorkflow(globalThis.appconfig);

        await wfm.generateIssueReport();

        globalThis.funcContext.trace(`techpass / issue_fetcher: Report generation completed`);
    }
    catch(e){
        
        // if app insights is enabled at function, will log to app insights.Traces
        globalThis.funcContext.error(`techpass / issue_fetcher: error message: ${e.message}, ${e.stack}`,  {is_error: true})

        return {
            status: 500,
            body: e.message
        };
    }
    
};


function initGlobalVariables(context, incidentStartFromDate: string) {
    //globalThis.wogTenantName = "WOG";
    globalThis.techpassTenantName = "TechPass";
    globalThis.appconfig = AppConfig.loadFromEnvVar(context);

    if (incidentStartFromDate) {
        globalThis.appconfig.incidentQueryStartFromDate = incidentStartFromDate;
    }
    
}

app.storageQueue('func_service_health_issue_fetcher', {
    queueName: 'incident-fetcher-in',
    connection: 'AzureWebJobsStorage',
    handler: func_service_health_issue_fetcher
});
