export default class AppConfig {
    TechpassClientId: string;
    TechpassClientSecret: string;
    TechpassTenantId: string;
    WogClientId: string;
    WogClientSecret: string;
    WogTenantId: string;
    IsDevTest: boolean;
    incidentQueryStartFromDate: string = '';

    static loadFromEnvVar(incidentQueryStartFromDate: string) {
        var appconfig = new AppConfig()

        appconfig.incidentQueryStartFromDate = incidentQueryStartFromDate;
        appconfig.TechpassClientId  = process.env.GCC_TECHPASS_CLIENT_ID
        appconfig.TechpassClientSecret  = process.env.GCC_TECHPASS_CLIENT_SECRET
        appconfig.TechpassTenantId  = process.env.GCC_TECHPASS_TENANT_ID
        appconfig.WogClientId  = process.env.GCC_WOG_CLIENT_ID
        appconfig.WogClientSecret  = process.env.GCC_WOG_CLIENT_SECRET
        appconfig.WogTenantId  = process.env.GCC_WOG_TENANT_ID

        if (process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST.toLowerCase() == 'true') {
            appconfig.IsDevTest = true
        }
        else {
            appconfig.IsDevTest = false
        }


        return appconfig
    }
  }