import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import * as _ from 'lodash';
import AppConfig from "../helpers/AppConfig";
import { DefaultAzureCredential } from "@azure/identity";

const queue = createQueueClient();


export async function func_http_gateway(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    try {

        const appconfig = AppConfig.loadFromEnvVar(context);

        var incidentStartFromDate = request.query.get('incidentStartFromDate');

        context.trace(`func_http_gateway: receive HTTP request`);

        if (_.isNil(incidentStartFromDate) == true || isNaN(Date.parse(incidentStartFromDate))) {
            
            let now = new Date();
            now.setDate(now.getDate() - appconfig.incidentDayFromNow)
            incidentStartFromDate = now.toLocaleDateString('en-US')
        }

        const msg = btoa(`{
            "incidentStartFromDate": "${incidentStartFromDate}"
        }`);

        context.trace(`func_http_gateway: send message to queue with incidentStartFromDate ${incidentStartFromDate}`)

        await queue.sendMessage(msg);

        return {
            status: 202,
            body: 'request to fetch and generate incident report is successfully accepted',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
    } catch (error) {
        context.error(`techpass - Error occured in function func_http_gateway, ${error.message}`,  {is_error: true});

        return {
            status: 500,
            body: `${error}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
//https://learn.microsoft.com/en-us/azure/storage/queues/passwordless-migrate-queues?tabs=roles-azure-portal%2Csign-in-visual-studio-code%2Cnodejs%2Cazure-portal-create%2Cazure-portal-associate%2Capp-service-identity%2Capp-service-connector%2Cassign-role-azure-portal#configure-your-local-development-environment
// https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-storage-queue?tabs=python
// https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-storage-table?tabs=nodejs

function createQueueClient(): QueueClient {
    const storage_queue_url = `https://${process.env.AZURE_STORAGE_NAME}.queue.core.windows.net`
    const credential = new DefaultAzureCredential();
    const queueName = 'incident-fetcher-in';
    const queueUrl = `${storage_queue_url}/${queueName}`
    const queueClient = new QueueClient(queueUrl, credential);
    return queueClient;
}


app.http('func_http_gateway', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: func_http_gateway,
    route: 'azure-incident-report/generate'
});
