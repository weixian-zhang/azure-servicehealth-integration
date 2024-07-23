import { InvocationContext } from "@azure/functions";
import IssueSendOnceStateManager from "./SendIssueDecisionTree";
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
    isosm: IssueSendOnceStateManager;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(context: InvocationContext, appconfig: AppConfig) {
        this.isosm = new IssueSendOnceStateManager();
        this.context = context;
        this.appconfig = appconfig;
    }

    public async generateIssueReport() {
      
        //techpass incidents
        const tpSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.TechPassClientSecretCredential)

        const tpIssues = []; //await this.getTechPassIssues(tpSubs, this.context);

        const tpIssuesToSend = await this.isosm.determineShouldSendIssues(this.context, tpIssues)

        //wog incidents

        const wogSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.wogClientSecretCredential)

        const wogIssues = await this.getWOGIssues(wogSubs, this.context)

        const wogIssuesToSend = await this.isosm.determineShouldSendIssues(this.context, wogIssues)

        //issue to HTML template and send email
        const htmlRenderer = new AzureIncidentReportRenderer();
        await htmlRenderer.init();

        const emailSink : IEmailSink = EmailSinkCreator.create(this.appconfig);

        for(const tpi of tpIssuesToSend) {
            
            const html: string = htmlRenderer.render(tpi);

            //TODO: local testing only
            await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\tp.html', html);
        //    if (fs.existsSync('C:\\Users\\weixzha\\Desktop\\a.html')) {
        //         await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\a.html', html);
        //    }

           globalThis.funcContext.info(`At ${new Date}, sending email with HTML report for WOG related incidents ${tpi.TrackingId}`);

           await emailSink.send(html);
        }

        for (const wogi of wogIssuesToSend) {

           const html: string = htmlRenderer.render(wogi);

           //TODO: local testing only
           await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\wog.html', html);
        //    if (fs.existsSync('C:\\Users\\weixzha\\Desktop\\a.html')) {
        //         await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\wog.html', html);
        //    }
           
           globalThis.funcContext.info(`At ${new Date}, sending email with HTML report for WOG related incidents ${wogi.TrackingId}`);

           await emailSink.send(html);

           return;
        }
    }

    async getTechPassIssues(subscriptions: Subscription[], context: InvocationContext) : Promise<ServiceIssue[]> {
        const techpassIR = new IssueFetcher(
            globalThis.techpassTenantName,
            globalThis.appconfig.TechPassClientSecretCredential, 
            subscriptions,
            appconfig, context);
    
        const issues = await techpassIR.getIssues();
    
        return issues;
    }
    
    async getWOGIssues(subscriptions: Subscription[], context: InvocationContext) : Promise<ServiceIssue[]> {
        const wogIR = new IssueFetcher(
            globalThis.wogTenantName,
            globalThis.appconfig.wogClientSecretCredential,
            subscriptions,
            appconfig, 
            context);
    
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