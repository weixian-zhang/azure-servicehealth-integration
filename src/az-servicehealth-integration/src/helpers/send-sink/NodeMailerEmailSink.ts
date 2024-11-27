import AppConfig from "../AppConfig";
import { EmailSinkResponse, IEmailSink } from "./IEmailSink";
import nodemailer from 'nodemailer';
import {SendMailOptions} from 'nodemailer';

// nodemailer example
// https://www.w3schools.com/nodejs/nodejs_email.asp
export default class NodeMailerEmailSink implements IEmailSink {
    appconfig: AppConfig;

    constructor(appconfig) {
        this.appconfig = appconfig;
    }
    
    async send(message: string): Promise<EmailSinkResponse> {

        const transporter = nodemailer.createTransport({
            host: this.appconfig.EMailConfig.Host,
            port: this.appconfig.EMailConfig.Port,
            auth: {
                user: this.appconfig.EMailConfig.Username,
                pass: this.appconfig.EMailConfig.Password
            }
        });
        

        const mailOptions: SendMailOptions = {
            from: this.appconfig.EMailConfig.SenderAddress,
            subject: this.appconfig.EMailConfig.Subject,
            text: this.appconfig.TemplateOutput == 'slack' ? message : '',
            html: this.appconfig.TemplateOutput == 'html' ? message : '',
            to: this.appconfig.EMailConfig.To,
            cc: this.appconfig.EMailConfig.CC,
            bcc: this.appconfig.EMailConfig.BCC
        };

        try {

            const result = await transporter.sendMail(mailOptions);
            //console.log('Email Sent: %s', result.messageId);

            return new EmailSinkResponse('Succeeded', null);

        } catch (error) {
            throw error;
            //return new EmailSinkResponse('Failed', error.message);
        }
    }
}