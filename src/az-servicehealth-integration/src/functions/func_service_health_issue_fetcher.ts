import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "./helpers/AppConfig";
import { ClientSecretCredential   } from "@azure/identity"
import IssueFetcher from "./helpers/issue-api/IssueFetcher";
import { ServiceIssue } from "./helpers/issue-api/ServiceIssueModels";
import { DB } from "./helpers/db/DB";
import IssueSendStateManager from "./helpers/IssueSendStateManager";
import * as _ from 'lodash';

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
    var db: DB;
    var wogTenantName: string;
    var techpassTenantName: string;
}


export async function func_service_health_issue_fetcher(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    try {

        globalThis.db = new DB();
        globalThis.wogTenantName = "WOG";
        globalThis.techpassTenantName = "TechPass";
        
        const incidentQueryStartFromDate = request.query.get('incidentStartFromDate');
        
        globalThis.appconfig = AppConfig.loadFromEnvVar(incidentQueryStartFromDate);

        const idm = new IssueSendStateManager();

        const tpIssues = await getTechPassIssues(context);

        const wogIssues = await getWOGIssues(context)

        const combinedIssues = tpIssues.concat(wogIssues)

        const issuesToSend = await idm.issuesToSendOrMarkResolved(combinedIssues);

        return {
            status: 200,
            body: `Retrieved [${ getTrackingIds(combinedIssues) }] issues, new/updates issues sent [${getTrackingIds(issuesToSend)}]`, //JSON.stringify({combinedIssues}),
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
    const techpassIR = new IssueFetcher(
        globalThis.techpassTenantName,
        globalThis.appconfig.TechPassClientSecretCredential, 
        globalThis.appconfig.TechPassResidentSubscriptionId,
        appconfig, context);

    const issues = await techpassIR.getIssues();

    return issues;
}

async function getWOGIssues(context: InvocationContext) : Promise<ServiceIssue[]> {
    const wogIR = new IssueFetcher(
        globalThis.wogTenantName,
        globalThis.appconfig.wogClientSecretCredential,
        globalThis.appconfig.WogResidentSubscriptionId,
        appconfig, 
        context);

    const issues = await wogIR.getIssues();

    return issues
}

function getTrackingIds(issues: ServiceIssue[]): string[] {
    const result = new Array();
    issues.forEach((i) => {result.push(i.TrackingId)});
    return result;
}

app.http('func_service_health_issue_fetcher', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: func_service_health_issue_fetcher
});
