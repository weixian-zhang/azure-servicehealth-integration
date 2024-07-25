import { app, InvocationContext, Timer } from "@azure/functions";
import AppConfig from "../helpers/AppConfig";
import * as _ from 'lodash';

export async function func_timer_http_client(myTimer: Timer, context: InvocationContext): Promise<void> {
    
    try {

        const appconfig = AppConfig.loadFromEnvVar();

        if (_.isNil(appconfig.httpGatewayURL) || _.isEmpty(appconfig.httpGatewayURL)) {
            context.error('httpGatewayURL not found in environment variable');
            return;
        }

        //const resp = await fetch(appconfig.httpGatewayURL);

        //context.trace(`func_timer_http_client called ${appconfig.httpGatewayURL} with status code ${resp.status}`);

    } catch (error) {
        context.error(error);
    }
}
    

app.timer('func_timer_http_client', {
    schedule: '0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *',
    handler: func_timer_http_client,
});
