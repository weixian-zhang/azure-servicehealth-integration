export default class AppConfig {
    TechpassClientId: string;
    TechpassClientSecret: string;
    TechpassTenantId: string;
    WogClientId: string;
    WogClientSecret: string;
    WogTenantId: string;

    static loadFromEnvVar() {
        var appconfg = new AppConfig()
        appconfg.TechpassClientId  = process.env.GCC_TECHPASS_CLIENT_ID
        appconfg.TechpassClientSecret  = process.env.GCC_TECHPASS_CLIENT_SECRET
        appconfg.TechpassTenantId  = process.env.GCC_TECHPASS_TENANT_ID
        appconfg.WogClientId  = process.env.GCC_WOG_CLIENT_ID
        appconfg.WogClientSecret  = process.env.GCC_WOG_CLIENT_SECRET
        appconfg.WogTenantId  = process.env.GCC_WOG_TENANT_ID

        return appconfg
    }
  }