import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import * as _ from 'lodash';

const queueName = 'incident-fetcher-in';
const queue = createQueueClient();

export async function func_http_gateway(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    
    try {

        const incidentStartFromDate = request.query.get('incidentStartFromDate');

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


function createQueueClient(): QueueClient {
    const q = new QueueClient(process.env.AZURE_STORAGE_QUEUE_CONNECTION_STRING, queueName);
    return q;
}


app.http('func_http_gateway', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: func_http_gateway,
    route: 'azure-incident-report/generate'
});
