import { ClientSecretCredential } from "@azure/identity";
import { context } from "@opentelemetry/api";
import * as _ from 'lodash';

export class EMailConfig {
    SenderAddress :string;
    Host: string;
    Port: number = 587;
    Username: string;
    Password: string;
    Subject: string;
    To: string[];
    CC: string[];
    BCC: string[];
}

export default class AppConfig {
    TechPassClientId: string;
    TechPassClientSecret: string;
    TechPassTenantId: string;
    TechPassClientSecretCredential: ClientSecretCredential;
    WogClientId: string;
    WogClientSecret: string;
    WogTenantId: string;
    WogResidentSubscriptionId: string;
    wogClientSecretCredential: ClientSecretCredential;
    IsDevTest: boolean;
    incidentQueryStartFromDate: string = '';
    AzureStorageConnString: string = '';
    EMailConfig: EMailConfig;
    AzureAppInsightsConnString: string = '';
    incidentDayFromNow: number = 5 //if HTTP Func does not provide query incidentStartFromDate, this config will be used
    httpGatewayURL: string = '' //used by func_timer_http_client only

    
    //use for local testing only, using Azure Communication Service email
    AzureCommunicationServiceConnString: string = '';


    static loadFromEnvVar() {//(incidentQueryStartFromDate: string) {

        var appconfig = new AppConfig()

        try {
            
            appconfig.TechPassClientId  = process.env.GCC_TECHPASS_CLIENT_ID;
            appconfig.TechPassClientSecret  = process.env.GCC_TECHPASS_CLIENT_SECRET;
            appconfig.TechPassTenantId  = process.env.GCC_TECHPASS_TENANT_ID;

            appconfig.WogClientId  = process.env.GCC_WOG_CLIENT_ID;
            appconfig.WogClientSecret  = process.env.GCC_WOG_CLIENT_SECRET;
            appconfig.WogTenantId  = process.env.GCC_WOG_TENANT_ID;
            appconfig.WogResidentSubscriptionId = process.env.GCC_WOG_RESIDENT_SUBSCRIPTION_ID;

            appconfig.AzureStorageConnString = process.env.AZURE_STORAGE_CONNECTION_STRING;

            appconfig.AzureAppInsightsConnString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

            this.createAzureCredentials(appconfig);

            if (process.env.SERVICE_HEALTH_INTEGRATION_IS_DEVTEST.toLowerCase() == 'true') {
                appconfig.IsDevTest = true
            }
            else {
                appconfig.IsDevTest = false
            }

            appconfig.AzureCommunicationServiceConnString = process.env.AZURE_COMM_SERVICE_CONN_STRING;

            appconfig.incidentDayFromNow = parseInt(process.env.SERVICE_HEALTH_INTEGRATION_INCIDENT_DAY_FROM_NOW)

            // load email config
            appconfig.EMailConfig = AppConfig.loadEmailConfig();

            appconfig.httpGatewayURL = process.env.HTTP_GATEWAY_URL;

            return appconfig

        } catch (e) {
            globalThis.funcContext.error(`${e.message}, ${e.stack}`)
        }
    }

    //sample
    // {
    //     "host": "",
    //     "port": 587,
    //     "username": "",
    //     "password": "",
    //     "subject": "Azure Incident Report",
    //     "senderAddress": "674edb48-246c-4119-ac71-7eabf6c96aa5.azurecomm.net",
    //      "recipients": {
    //         "to": ["weixzha@microsoft.com"],
    //         "cc": [],
    //         "bcc": []
    //     }
    // }
    static loadEmailConfig(): EMailConfig {

        let emcEnvvar = process.env.SERVICE_HEALTH_INTEGRATION_EMAIL_CONFIG;

        if(_.isEmpty(emcEnvvar)) {
            throw new Error('Email config is not found in environement variables')
        }

        const emc: any = JSON.parse(emcEnvvar);

        if (!_.isArray(emc.recipients.to) || !_.isArray(emc.recipients.cc) || !_.isArray(emc.recipients.bcc)) {
            throw new Error('Email config "to", "cc", "bcc" is invalid array []. "[]" is default value')
        }

        const mc = new EMailConfig();
        mc.Subject = emc.subject;
        mc.SenderAddress = emc.senderAddress;
        mc.Host = emc.host;
        mc.Port = emc.port;
        mc.Username = emc.username;
        mc.Password = emc.password;
        mc.To = emc.recipients.to;
        mc.CC = emc.recipients.cc;
        mc.BCC = emc.recipients.bcc;

        return mc;
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