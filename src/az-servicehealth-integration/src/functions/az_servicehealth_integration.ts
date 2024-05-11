import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ClientSecretCredential, DefaultAzureCredential, EnvironmentCredential, EnvironmentCredentialOptions  } from "@azure/identity"
import { MicrosoftResourceHealth } from "@azure/arm-resourcehealth"
import AppConfig from "./appconfig";

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
}

function initAzureCredential() {


    globalThis.wogAzCred = new ClientSecretCredential(
        globalThis.appconfig.wogTenantId,
        globalThis.appconfig.wogClientId,
        globalThis.appconfig.wogClientSecret
      );

    globalThis.techpassAzCred = new ClientSecretCredential(
      globalThis.appconfig.techpassTenantId,
      globalThis.appconfig.techpassClientId,
      globalThis.appconfig.techpassClientSecret

    );
}

export async function az_servicehealth_integration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // context.log(`Http function processed request for url "${request.url}"`);

    globalThis.appconfig = AppConfig.loadFromEnvVar()

    initAzureCredential()

    const subscriptionId = "d8732e82-febd-4b92-b1ed-8fbce80a9ad8"
    const credential = globalThis.techpassAzCred;
    const client = new MicrosoftResourceHealth(new DefaultAzureCredential(), subscriptionId) ;
    //const accessToken =  await credential.getToken("https://management.azure.com/user_impersonation")

    const resArray = new Array();

    for await (let item of client.eventsOperations.listByTenantId(null)) {
        resArray.push(item);
    }

    console.log(resArray);

    return { body: `Hello, World}!` };
};

app.http('az_servicehealth_integration', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: az_servicehealth_integration
});
