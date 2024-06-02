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
            host: process.env.SERVICE_HEALTH_INTEGRATION_EMAIL_HOST,
            port: 587,
            auth: {
                user: process.env.SERVICE_HEALTH_INTEGRATION_EMAIL_USERNAME,
                pass: process.env.SERVICE_HEALTH_INTEGRATION_EMAIL_PASSWORD
            }
        });
    
        const mailOptions: SendMailOptions = {
            from: '',
            subject: 'Azure Incident Report',
            text: '',
            html: message,
            to: '',
            cc: '',
            bcc: ''
        };

        try {

            const result = await transporter.sendMail(mailOptions);
            console.log('Email Sent: %s', result.messageId);

            return new EmailSinkResponse('Succeeded', null);

        } catch (error) {
            return new EmailSinkResponse('Failed', error.message);
        }
    }
}