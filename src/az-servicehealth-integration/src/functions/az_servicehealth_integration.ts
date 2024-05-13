import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ClientSecretCredential, DefaultAzureCredential, OnBehalfOfCredential   } from "@azure/identity"
import { MicrosoftResourceHealth } from "@azure/arm-resourcehealth"
import AppConfig from "./helpers/AppConfig";

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
}

function initAzureCredential() {


    globalThis.wogAzCred = new ClientSecretCredential(
        globalThis.appconfig.WogTenantId,
        globalThis.appconfig.WogClientId,
        globalThis.appconfig.WogClientSecret
      );

    globalThis.techpassAzCred = new ClientSecretCredential(
      globalThis.appconfig.TechpassTenantId,
      globalThis.appconfig.TechpassClientId,
      globalThis.appconfig.TechpassClientSecret

    );
}

export async function az_servicehealth_integration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // context.log(`Http function processed request for url "${request.url}"`);

    try {
        // globalThis.appconfig = AppConfig.loadFromEnvVar()

        // initAzureCredential()

        const subscriptionId = "d8732e82-febd-4b92-b1ed-8fbce80a9ad8"
        const credential = globalThis.techpassAzCred;
        const client = new MicrosoftResourceHealth(new DefaultAzureCredential()) ;
        //const accessToken =  await credential.getToken("https://management.azure.com/user_impersonation")

        const resArray = new Array();

        const iterator = client.eventsOperations.listByTenantId(null)
        let next;

        while ((next = await iterator.next()).done === false) {
            resArray.push(next.value);
        }

        // for await (const item of client.eventsOperations.listByTenantId(null)) {
            
        // }

        console.log(resArray);

        return { body: `Hello, World}!` };
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
