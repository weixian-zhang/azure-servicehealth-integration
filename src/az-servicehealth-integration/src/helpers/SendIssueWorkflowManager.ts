import { InvocationContext } from "@azure/functions";
import IssueSendDuplicatePreventer from "./issue-api/IssueSendDuplicatePreventer";
import IssueFetcher from "./issue-api/IssueFetcher";
import { ServiceIssue, Subscription } from "./issue-api/ServiceIssueModels";
import AppConfig from "./AppConfig";
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { ClientSecretCredential } from "@azure/identity";
import ReportRenderer from "./template-engine/ReportRenderer";
import * as fs from 'fs'; //testing only
import EmailSinkCreator from "./send-sink/EmailSinkCreator";
import { IEmailSink } from "./send-sink/IEmailSink";
import { DB } from "./DB";

export default class IssueReportGenerationWorkflow {
    sendDupPreventer: IssueSendDuplicatePreventer;
    context: InvocationContext;
    appconfig: AppConfig;

    constructor(appconfig: AppConfig) {
        const db = new DB(appconfig);
        this.sendDupPreventer = new IssueSendDuplicatePreventer(db);
        this.appconfig = appconfig;
    }

    public async generateIssueReport() {

        await this.sendDupPreventer.init(); // init tabel storage
      
        var tpIssuesToSend = []
        try {
            
            globalThis.funcContext.trace(`techpass / issue_fetcher: get subscriptions by service principal`);

            const tpSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.TechPassClientSecretCredential)

            globalThis.funcContext.trace(`techpass / issue_fetcher: get issues`);

            const tpIssues = await this.getTechPassIssues(tpSubs);

            globalThis.funcContext.trace(`techpass / issue_fetcher: determine if issues should be send`);

            tpIssuesToSend = await this.sendDupPreventer.determineShouldSendIssues(tpIssues)

            globalThis.funcContext.trace(`techpass / issue_fetcher: issues count to send: ${tpIssuesToSend.length}`)

        } catch (e) {
            globalThis.funcContext.error(`techpass / issue_fetcher: error message: ${e.message}, ${e.stack}`, {is_error: true})
        }
        

        //wog incidents
        //var wogIssuesToSend = []
        
        // try {

        //     const wogSubs = await this.getSubscriptionsByServicePrincipalRBAC(globalThis.appconfig.wogClientSecretCredential)

        //     const wogIssues = await this.getWOGIssues(wogSubs)

        //     wogIssuesToSend = await this.sendDupPreventer.determineShouldSendIssues(wogIssues)

        //     globalThis.funcContext.trace(`WOG issues count to send: ${wogIssuesToSend.length}`)

        // } catch (e) {
        //     globalThis.funcContext.error(`error message: ${e.message}, ${e.stack}`,  {is_error: true})
        // }
        

        //issue to HTML template and send email
        const rp = new ReportRenderer();
        await rp.init(this.appconfig);

        const emailSink : IEmailSink = EmailSinkCreator.create(this.appconfig);

        for(const tpi of tpIssuesToSend) {

            const output: string = rp.render(tpi);

            //local testing only
            //await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\tp.txt', output, {encoding:'utf8',flag:'w'});
        
            await emailSink.send(output);

            globalThis.funcContext.trace(`techpass - Sent email report for TechPass incident ${tpi.TrackingId}`);

        }

        // for (const wogi of wogIssuesToSend) {

        //    const html: string = htmlRenderer.render(wogi);

        //    //local testing only
        //    //await fs.promises.writeFile('C:\\Users\\weixzha\\Desktop\\wog.html', html, {encoding:'utf8',flag:'w'});

        //    await emailSink.send(html);

        //    globalThis.funcContext.trace(`Sent HTML report as email for WOG related incidents ${wogi.TrackingId}`);

        // }
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
    
    // async getWOGIssues(subscriptions: Subscription[]) : Promise<ServiceIssue[]> {
    //     const wogIR = new IssueFetcher(
    //         globalThis.wogTenantName,
    //         globalThis.appconfig.wogClientSecretCredential,
    //         subscriptions,
    //         appconfig);
    
    //     const issues = await wogIR.getIssues();
    
    //     return issues
    // }

    async getSubscriptionsByServicePrincipalRBAC(sp: ClientSecretCredential): Promise<Subscription[]> {
        const subClient = new SubscriptionClient(sp);
        const result = new Array<Subscription>();

        for await (const s of subClient.subscriptions.list()) {
            result.push(new Subscription(s.subscriptionId, s.displayName))
        }
        return result;
    }
}