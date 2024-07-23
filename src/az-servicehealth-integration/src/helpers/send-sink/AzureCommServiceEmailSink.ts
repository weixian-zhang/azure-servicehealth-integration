import { EmailClient, EmailMessage, EmailAddress } from "@azure/communication-email";
import {EmailSinkResponse, IEmailSink} from "./IEmailSink";
import AppConfig from "../AppConfig";

// for local testing purposes without actual Email account
export default class AzureCommServiceEmailSink implements IEmailSink {
    emailClient: EmailClient;
    appconfig: AppConfig;

    constructor (appconfig: AppConfig) {
        const connString = appconfig.AzureCommunicationServiceConnString;
        this.emailClient = new EmailClient(connString);
        this.appconfig = appconfig;
    }
    
    async send(message: string): Promise<EmailSinkResponse> {

        const toAddrs = Array<EmailAddress>();
        const ccAddrs = Array<EmailAddress>();
        const bccAddrs = Array<EmailAddress>();

        this.appconfig.EMailConfig.To.forEach((t) => {
            toAddrs.push({address: t});
        })

        this.appconfig.EMailConfig.CC.forEach((c) => {
            ccAddrs.push({address: c});
        })

        this.appconfig.EMailConfig.BCC.forEach((b) => {
            bccAddrs.push({address: b});
        })

        const emailMessage: EmailMessage = {
            senderAddress: "DoNotReply@674edb48-246c-4119-ac71-7eabf6c96aa5.azurecomm.net",
            content: {
                subject: this.appconfig.EMailConfig.Subject,
                html: message,
            },
            recipients: {
                to: toAddrs,
                cc: ccAddrs,
                bcc: bccAddrs
            },
        };
    
        const poller = await this.emailClient.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        
        return new EmailSinkResponse(result.status, result.error);
        
    }
}