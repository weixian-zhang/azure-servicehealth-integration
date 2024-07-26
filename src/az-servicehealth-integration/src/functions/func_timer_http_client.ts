import { app, InvocationContext, Timer } from "@azure/functions";
import AppConfig from "../helpers/AppConfig";
import * as _ from 'lodash';
import querystring  from 'querystring';
import { error } from "console";

export async function func_timer_http_client(myTimer: Timer, context: InvocationContext): Promise<void> {
    
    try {

        const appconfig = AppConfig.loadFromEnvVar();

        if (_.isNil(appconfig.httpGatewayURL) || _.isEmpty(appconfig.httpGatewayURL)) {
            context.error('httpGatewayURL not found in environment variable');
            return;
        }

        const funcKey = process.env.FUNCTION_HOST_KEY ?? ''

        if (_.isEmpty(funcKey)) {
            throw error('FUNCTION_HOST_KEY is not found in app settings')
        }
        
        const queryString = {
            "code": funcKey
        }

        const url = appconfig.httpGatewayURL + '?' + querystring.stringify(queryString)

        const resp = await fetch(url);

        context.trace(`func_timer_http_client called ${appconfig.httpGatewayURL} with status code ${resp.status}`);

    } catch (error) {
        context.error(error);
    }
}
    

app.timer('func_timer_http_client', {
    schedule: '0 5,10,15,20,25,30,35,40,45,50,55 * * * *',
    handler: func_timer_http_client,
});
