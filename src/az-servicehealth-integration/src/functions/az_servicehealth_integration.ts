import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "./helpers/AppConfig";
import { ClientSecretCredential   } from "@azure/identity"
import { IssueRetriever } from "./helpers/issue-api/IssueRetriever";
import { ServiceIssue } from "./helpers/issue-api/ServiceIssueModels";

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
}


export async function az_servicehealth_integration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    try {
        
        const incidentQueryStartFromDate = request.query.get('incidentStartFromDate');
        
        globalThis.appconfig = AppConfig.loadFromEnvVar(incidentQueryStartFromDate);

        const tpIssues = await getTechPassIssues(context);

        const wogIssues = await getWOGIssues(context)

        const combinedIssues = tpIssues.concat(wogIssues)

        return {
            status: 200,
            body: JSON.stringify({combinedIssues}),
            headers: {
                'Content-Type': 'application/json'
            }
        };

    }
    catch(e){
     
        const errMsg = e.message; // error under useUnknownInCatchVariables
        context.error(errMsg)
        return {
            status: 400,
            body: errMsg
        };
    }
    
};

async function getTechPassIssues(context: InvocationContext) : Promise<ServiceIssue[]> {
    const techpassIR = new IssueRetriever(
        globalThis.appconfig.TechPassClientSecretCredential, 
        globalThis.appconfig.TechPassResidentSubscriptionId,
        appconfig, context);

    const issues = await techpassIR.getIssues();

    return issues;
}

async function getWOGIssues(context: InvocationContext) : Promise<ServiceIssue[]> {
    const wogIR = new IssueRetriever(
        globalThis.appconfig.wogClientSecretCredential,
        globalThis.appconfig.WogResidentSubscriptionId,
        appconfig, 
        context);

    const issues = await wogIR.getIssues();

    return issues
}

app.http('az_servicehealth_integration', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: az_servicehealth_integration
});
