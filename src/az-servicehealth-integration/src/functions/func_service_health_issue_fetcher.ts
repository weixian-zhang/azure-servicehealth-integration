import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import AppConfig from "../helpers/AppConfig";
import { ClientSecretCredential   } from "@azure/identity"
import { DB } from "../helpers/db/DB";
import * as _ from 'lodash';
import SendIssueWorkflowManager from "../helpers/SendIssueWorkflowManager";

import * as opentelemetry from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { BasicTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ApplicationInsightsSampler, AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { detectResourcesSync } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations, getResourceDetectors } from'@opentelemetry/auto-instrumentations-node';

declare global {
    var appconfig: AppConfig;
    var wogAzCred: ClientSecretCredential;
    var techpassAzCred: ClientSecretCredential;
    var db: DB;
    var wogTenantName: string;
    var techpassTenantName: string;
    var tracer: opentelemetry.Tracer;
    var funcRootSpan: opentelemetry.Span;
}

class QueueData {
    incidentStartFromDate: string
}

const queueConnStringEnvName = 'AZURE_STORAGE_QUEUE_CONNECTION_STRING';

//https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/monitor/monitor-opentelemetry-exporter/samples/v1-beta/typescript/src/basicTracerNode.ts
//https://opentelemetry.io/docs/languages/js/exporters/
//https://nitin-rohidas.medium.com/using-custom-span-attributes-in-opentelemetry-21e1ac33ec4c


// multiple function example
// https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=typescript%2Cwindows%2Cazure-cli&pivots=nodejs-model-v4#folder-structure
// https://github.com/Azure-Samples/azure-functions-nodejs-stream/tree/main/src
export async function func_service_health_issue_fetcher(data: QueueData, context: InvocationContext): Promise<HttpResponseInit> {

    

    try {
        
        initGlobalAppConfig(data.incidentStartFromDate);

        initOpenTelemetryAppInsightsAsExporter();

        globalThis.funcRootSpan = tracer.startSpan('func_service_health_issue_fetcher');

        const wfm = new SendIssueWorkflowManager(context, globalThis.appconfig);

        await wfm.generateIssueReport();
    }
    catch(e){
        
        // if app insights is enabled at function, will log to app insights.Traces
        context.error(e.message)

        return {
            status: 500,
            body: e.message
        };
    }
    finally {
        globalThis.funcRootSpan.end();
    }
    
};

//https://learn.microsoft.com/en-us/azure/azure-functions/opentelemetry-howto?tabs=app-insights&pivots=programming-language-javascript
function initOpenTelemetryAppInsightsAsExporter() {
    // Sampler expects a sample rate of between 0 and 1 inclusive
    // A rate of 0.75 means approximately 75 % of your traces will be sent

    // Configure span processor to send spans to the exporter
    const exporter = new AzureMonitorTraceExporter({
        connectionString: globalThis.appconfig.AzureAppInsightsConnString
    });

    const resource = detectResourcesSync({ detectors: getResourceDetectors() });

    const tracerProvider = new NodeTracerProvider({ resource });
    tracerProvider.addSpanProcessor(new SimpleSpanProcessor(exporter));

    // const aiSampler = new ApplicationInsightsSampler(0.75);
    // const provider = new BasicTracerProvider({
    //         sampler: aiSampler,
    //         resource: new Resource({ "service-health-fetcher": "basic-service",
    //     }),
    // });

    
    //provider.addSpanProcessor(new SimpleSpanProcessor(exporter as any));

    tracerProvider.register();
    globalThis.tracer  = opentelemetry.trace.getTracer("basic-tracer-fir-issue-fetcher");
}


function initGlobalAppConfig(incidentStartFromDate: string) {

    globalThis.db = new DB();
    globalThis.wogTenantName = "WOG";
    globalThis.techpassTenantName = "TechPass";
    
    globalThis.appconfig = AppConfig.loadFromEnvVar(incidentStartFromDate);
}


app.storageQueue('func_service_health_issue_fetcher', {
    queueName: 'incident-fetcher-in',
    connection: queueConnStringEnvName,
    handler: func_service_health_issue_fetcher
});
