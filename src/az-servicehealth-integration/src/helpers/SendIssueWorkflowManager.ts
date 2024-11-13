import { InvocationContext } from "@azure/functions";
import IssueSendDuplicatePreventer from "./IssueSendDuplicatePreventer";
import IssueFetcher from "./issue-api/IssueFetcher";
import { ServiceIssue, Subscription } from "./issue-api/ServiceIssueModels";
import AppConfig from "./AppConfig";
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { ClientSecretCredential } from "@azure/identity";
import AzureIncidentReportRenderer from "./template-engine/AzureIncidentReportRenderer";
import * as fs from 'fs'; //testing only
import EmailSinkCreator from "./send-sink/EmailSinkCreator";
import { IEmailSink } from "./send-sink/IEmailSink";
import * as opentelemetry from "@opentelemetry/api";

export default class IssueReportGenerationWorkflow {
    sendDupPreventer: IssueSendDuplicatePreventer;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(appconfig: AppConfig) {
        this.sendDupPreventer = new IssueSendDuplicatePreventer();
        this.appconfig = appconfig;
    }

    public async generateIssueReport() {

        await this.sendDupPreventer.init(); // init tabel storage
      
        //techpass incidents

        var tpIssuesToSend = []
        try {
            
            const tpSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.TechPassClientSecretCredential)

            const tpIssues = await this.getTechPassIssues(tpSubs);

            tpIssuesToSend = await this.sendDupPreventer.determineShouldSendIssues(tpIssues)

            globalThis.funcContext.trace(`TechPass issues count to send: ${tpIssuesToSend.length}`)

        } catch (e) {
            globalThis.funcContext.error(`error message: ${e.message}, ${e.stack}`, {is_error: true})
        }
        

        //wog incidents
        var wogIssuesToSend = []
        
        try {

            const wogSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.wogClientSecretCredential)

            const wogIssues = await this.getWOGIssues(wogSubs)

            wogIssuesToSend = await this.sendDupPreventer.determineShouldSendIssues(wogIssues)

            globalThis.funcContext.trace(`WOG issues count to send: ${wogIssuesToSend.length}`)

        } catch (e) {
            globalThis.funcContext.error(`error message: ${e.message}, ${e.stack}`,  {is_error: true})
        }
        

        //issue to HTML template and send email
        const htmlRenderer = new AzureIncidentReportRenderer();
        await htmlRenderer.init();

        const emailSink : IEmailSink = EmailSinkCreator.create(this.appconfig);

        for(const tpi of tpIssuesToSend) {
            
            const html: string = htmlRenderer.render(tpi);

            //local testing only
            //await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\tp.html', html, {encoding:'utf8',flag:'w'});
        
           await emailSink.send(html);

           globalThis.funcContext.trace(`Sent HTML report as email for TechPass related incidents ${tpi.TrackingId}`);
        }

        for (const wogi of wogIssuesToSend) {

           const html: string = htmlRenderer.render(wogi);

           //local testing only
           //await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\wog.html', html, {encoding:'utf8',flag:'w'});

           await emailSink.send(html);

           globalThis.funcContext.trace(`Sent HTML report as email for WOG related incidents ${wogi.TrackingId}`);

        }
    }

    async getTechPassIssues(subscriptions: Subscription[]) : Promise<ServiceIssue[]> {
        const techpassIR = new IssueFetcher(
            globalThis.techpassTenantName,
            globalThis.appconfig.TechPassClientSecretCredential, 
            subscriptions,
            appconfig);
    
        const issues = await techpassIR.getIssues();
    
        return issues;
    }
    
    async getWOGIssues(subscriptions: Subscription[]) : Promise<ServiceIssue[]> {
        const wogIR = new IssueFetcher(
            globalThis.wogTenantName,
            globalThis.appconfig.wogClientSecretCredential,
            subscriptions,
            appconfig);
    
        const issues = await wogIR.getIssues();
    
        return issues
    }

    async getSubscriptionsByServicePrincipalRBAC(sp: ClientSecretCredential): Promise<Subscription[]> {
        const subClient = new SubscriptionClient(sp);
        const result = new Array<Subscription>();

        for await (const s of subClient.subscriptions.list()) {
            result.push(new Subscription(s.subscriptionId, s.displayName))
        }
        return result;
    }
}