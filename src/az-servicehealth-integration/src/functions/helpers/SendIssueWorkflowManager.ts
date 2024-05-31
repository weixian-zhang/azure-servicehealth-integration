import { InvocationContext } from "@azure/functions";
import IssueSendOnceStateManager from "./IssueToSendDecisionTree";
import IssueFetcher from "./issue-api/IssueFetcher";
import { ServiceIssue, Subscription } from "./issue-api/ServiceIssueModels";
import AppConfig from "./AppConfig";
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { ClientSecretCredential } from "@azure/identity";
import AzureIncidentReportRenderer from "./template-engine/AzureIncidentReportRenderer";

import * as fs from 'fs'; //testing only
import EmailSinkCreator from "./send-sink/EmailSinkCreator";
import { IEmailSink } from "./send-sink/IEmailSink";

export default class IssueReportGenerationWorkflow {
    isosm: IssueSendOnceStateManager;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(context: InvocationContext, appconfig: AppConfig) {
        this.isosm = new IssueSendOnceStateManager();
        this.context = context;
        this.appconfig = appconfig;
    }

    public async generateIssueReport(): Promise<string> {

        
        //techpass
        //const tpSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.TechPassClientSecretCredential)

        //const tpIssues = await this.getTechPassIssues(tpSubs, this.context);

        //const tpIssuesToSend = this.isosm.collectIssuesToSendOrMarkResolved(this.context, tpIssues)

        //wog

        const wogSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.wogClientSecretCredential)

        const wogIssues = await this.getWOGIssues(wogSubs, this.context)

        //const wogIssuesToSend = await this.isosm.determineShouldSendIssues(this.context, wogIssues)

        //issue to HTML template and send email
        const htmlRenderer = new AzureIncidentReportRenderer();
        await htmlRenderer.init();

        for (const wogi of wogIssues) {

           const html: string = htmlRenderer.render(wogi);

           //TODO: send email
           await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\a.html', html);

           const emailSink : IEmailSink = EmailSinkCreator.create(this.appconfig);

           //await emailSink.send(html);

           return;
        }
    
        return '';
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