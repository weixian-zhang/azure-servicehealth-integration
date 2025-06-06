import { app, InvocationContext, Timer } from "@azure/functions";
import AppConfig from "../helpers/AppConfig";
import * as _ from 'lodash';
import querystring  from 'querystring';
import { error } from "console";

export async function func_timer_http_client(myTimer: Timer, context: InvocationContext): Promise<void> {
    
    try {

        const appconfig = AppConfig.loadFromEnvVar(context);

        if (_.isNil(appconfig.httpGatewayURL) || _.isEmpty(appconfig.httpGatewayURL)) {
            context.error('func_timer_http_client: httpGatewayURL not found in environment variable');
            return;
        }

        const url = appconfig.httpGatewayURL; // + '?code=' + querystring.stringify(queryString)

        context.trace(`func_timer_http_client:  calling ${appconfig.httpGatewayURL}`);

        const resp = await fetch(url);

        context.trace(`func_timer_http_client: received response of status code ${resp.status}`);

    } catch (error) {
        context.error(`func_timer_http_client: ${error}`);
    }
}
    

app.timer('func_timer_http_client', {
    schedule: '0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *',
    handler: func_timer_http_client,
});
