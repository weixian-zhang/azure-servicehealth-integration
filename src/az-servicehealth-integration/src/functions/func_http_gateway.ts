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

function getValidDate(val: string) {
    try {
        return new Date(val);
    } catch (error) {
        const d = new Date();
        const dateSubstract3Days = d.setDate(d.getDate() - 3);
        return dateSubstract3Days;
    }
}


function createQueueClient(): QueueClient {
    const q = new QueueClient(process.env.AZURE_STORAGE_CONNECTION_STRING, queueName);
    return q;
}


app.http('func_http_gateway', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: func_http_gateway,
    route: 'azure-incident-report/generate'
});
