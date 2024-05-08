export default class AppConfig {
    techpassClientId: string;
    techpassClientSecret: string;
    techpassTenantId: string;
    wogClientId: string;
    wogClientSecret: string;
    wogTenantId: string;
   
    // constructor(techpassClientId: string, techpassClientSecret: string, techpassTenantId: string,
    //     wogClientId: string, wogClientSecret: string, wogTenantId: string  ) {
    //     this.techpassClientId = techpassClientId;
    //     this.techpassClientSecret = techpassClientSecret;
    //     this.techpassTenantId = techpassTenantId;
    //     this.wogClientId = wogClientId;
    //     this.wogClientSecret = wogClientSecret;
    //     this.wogTenantId = wogTenantId;
    // }

    static loadFromEnvVar() {
        var appconfg = new AppConfig()
        appconfg.techpassClientId  = process.env.GCC_TECHPASS_CLIENT_ID
        appconfg.techpassClientSecret  = process.env.GCC_TECHPASS_CLIENT_SECRET
        appconfg.techpassTenantId  = process.env.GCC_TECHPASS_TENANT_ID
        appconfg.wogClientId  = process.env.GCC_WOG_CLIENT_ID
        appconfg.wogClientSecret  = process.env.GCC_WOG_CLIENT_SECRET
        appconfg.wogTenantId  = process.env.GCC_WOG_TENANT_ID

        return appconfg
    }
  }