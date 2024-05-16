import { ClientSecretCredential } from "@azure/identity";

export default class AppConfig {
    TechPassClientId: string;
    TechPassClientSecret: string;
    TechPassTenantId: string;
    TechPassResidentSubscriptionId: string;
    TechPassClientSecretCredential: ClientSecretCredential;
    WogClientId: string;
    WogClientSecret: string;
    WogTenantId: string;
    WogResidentSubscriptionId: string;
    wogClientSecretCredential: ClientSecretCredential;
    IsDevTest: boolean;
    incidentQueryStartFromDate: string = '';

    static loadFromEnvVar(incidentQueryStartFromDate: string) {

        var appconfig = new AppConfig()

        appconfig.incidentQueryStartFromDate = incidentQueryStartFromDate;

        appconfig.TechPassClientId  = process.env.GCC_TECHPASS_CLIENT_ID;
        appconfig.TechPassClientSecret  = process.env.GCC_TECHPASS_CLIENT_SECRET;
        appconfig.TechPassTenantId  = process.env.GCC_TECHPASS_TENANT_ID;
        appconfig.TechPassResidentSubscriptionId = process.env.GCC_TECHPASS_RESIDENT_SUBSCRIPTION_ID;

        appconfig.WogClientId  = process.env.GCC_WOG_CLIENT_ID;
        appconfig.WogClientSecret  = process.env.GCC_WOG_CLIENT_SECRET;
        appconfig.WogTenantId  = process.env.GCC_WOG_TENANT_ID;
        appconfig.WogResidentSubscriptionId = process.env.GCC_WOG_RESIDENT_SUBSCRIPTION_ID;

        this.createAzureCredentials(appconfig);

        if (process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST.toLowerCase() == 'true') {
            appconfig.IsDevTest = true
        }
        else {
            appconfig.IsDevTest = false
        }

        return appconfig
    }

    static createAzureCredentials(appconfig: AppConfig) {

        appconfig.wogClientSecretCredential = new ClientSecretCredential(
            appconfig.WogTenantId,
            appconfig.WogClientId,
            appconfig.WogClientSecret
          );
    
        appconfig.TechPassClientSecretCredential = new ClientSecretCredential(
            appconfig.TechPassTenantId,
            appconfig.TechPassClientId,
            appconfig.TechPassClientSecret
        )
    
    }
  }