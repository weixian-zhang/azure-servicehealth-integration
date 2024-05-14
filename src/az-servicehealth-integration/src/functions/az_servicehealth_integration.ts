import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "./helpers/AppConfig";
import { ClientSecretCredential, DefaultAzureCredential, OnBehalfOfCredential   } from "@azure/identity"
import { MicrosoftResourceHealth } from "@azure/arm-resourcehealth"
import { IssueRetriever } from "./helpers/IssueRetriever";

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
}



export async function az_servicehealth_integration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // context.log(`Http function processed request for url "${request.url}"`);

    try {
        
        const incidentQueryStartFromDate = request.query.get('incidentStartFromDate');
        
        globalThis.appconfig = AppConfig.loadFromEnvVar(incidentQueryStartFromDate);

        const techpassIR = new IssueRetriever(
            globalThis.appconfig.TechPassClientSecretCredential, 
            globalThis.appconfig.TechPassResidentSubscriptionId,
            appconfig, context);

        const techpassIssues = await techpassIR.getIssues();

        const wogIR = new IssueRetriever(
            globalThis.appconfig.wogClientSecretCredential,
            globalThis.appconfig.WogResidentSubscriptionId,
            appconfig, 
            context);

        const wogIssues = await wogIR.getIssues();

        return {
            status: 200, /* Defaults to 200 */
            body: JSON.stringify({techpassIssues}),
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

app.http('az_servicehealth_integration', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: az_servicehealth_integration
});
