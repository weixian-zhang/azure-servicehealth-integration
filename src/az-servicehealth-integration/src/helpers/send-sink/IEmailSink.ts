export class EmailSinkResponse {
    Status: string;
    Error: string;
    constructor(status, error) {
        this.Status = status;
        this.Error = error;
    }
}

export interface IEmailSink {
    send(message: string): Promise<EmailSinkResponse>;
}
