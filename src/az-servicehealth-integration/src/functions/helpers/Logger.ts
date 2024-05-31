
// import {TelemetryClient} from 'applicationinsights';
// import AppConfig from './AppConfig';

// //https://learn.microsoft.com/en-us/azure/azure-monitor/app/monitor-functions#distributed-tracing-for-nodejs-function-apps
// //https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-add-modify?tabs=nodejs#send-custom-telemetry-using-the-application-insights-classic-api
// export default class Logger {
//     private aiClient: TelemetryClient;

//     constructor() {
//         //appInsights.setup(globalThis.appconfig.AzureAppInsightsConnString).start();
//         //this.aiClient = appInsights.defaultClient;
//         this.aiClient = new TelemetryClient();
//     }

//     error(err: Error) {
//         this.aiClient.trackException({exception: err});
//     }
// }