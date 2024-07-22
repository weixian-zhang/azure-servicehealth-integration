import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { QueueClient, QueueServiceClient } from "@azure/storage-queue";
import * as _ from 'lodash';
import AppConfig from "../helpers/AppConfig";
import { DefaultAzureCredential } from "@azure/identity";

const queueName = 'incident-fetcher-in';
const queue = createQueueClient();


export async function func_http_gateway(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    try {

        const appconfig = AppConfig.loadFromEnvVar();

        let incidentStartFromDate = request.query.get('incidentStartFromDate');

        if (_.isNil(incidentStartFromDate) == true || _.isDate(incidentStartFromDate) == false) {
            
            let now = new Date();
            now.setDate(now.getDate() - appconfig.incidentDayFromNow)
            incidentStartFromDate = now.toLocaleDateString('en-US')
            
        }

        const msg = btoa(`{
            "incidentStartFromDate": "${incidentStartFromDate}"
        }`);

        await queue.sendMessage(msg);

        return {
            status: 202,
            body: 'request to fetch and generate incident report is successfully accepted',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
    } catch (error) {
        console.error(`Error occured in function func_http_gateway, ${error.message}`);

        return {
            status: 500,
            body: `${error}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

// https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-storage-queue?tabs=python
// https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-storage-table?tabs=nodejs

function createQueueClient(): QueueClient {
    const q = new QueueServiceClient(process.env.AZURE_STORAGEQUEUE_RESOURCEENDPOINT, new DefaultAzureCredential());
    //const q = new QueueClient(process.env.AzureWebJobsStorage, queueName);//QueueClient(process.env.AZURE_STORAGE_QUEUE_CONNECTION_STRING, queueName);
    return q.getQueueClient(queueName)
}


app.http('func_http_gateway', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: func_http_gateway,
    route: 'azure-incident-report/generate'
});
