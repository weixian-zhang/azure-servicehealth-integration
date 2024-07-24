import AppConfig from "../AppConfig";
import AzureCommServiceEmailSink from "./AzureCommServiceEmailSink";
import { IEmailSink } from "./IEmailSink";
import NodeEmailSink from "./NodeMailerEmailSink";

export default class EmailSinkCreator {
    static create(appconfig: AppConfig) : IEmailSink {
        // if (appconfig.IsDevTest) {
        //     return new AzureCommServiceEmailSink(appconfig);
        // }
        return new NodeEmailSink(appconfig);
    }
}