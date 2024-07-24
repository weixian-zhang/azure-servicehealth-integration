import * as nunjucks from 'nunjucks'
import {Environment} from 'nunjucks';
import * as fs from 'fs';
import { ServiceIssue } from '../issue-api/ServiceIssueModels';

// https://mozilla.github.io/nunjucks/templating.html
export default class AzureIncidentReportRenderer {
    private tplPath = __dirname;
    private tplMain = "\\html-incident-report.njk";
    private nunjucksEnv: Environment = null;
    private htmlReportTemplate: string = '';

    constructor() {
        
    }
    
    public async init() {
        this.htmlReportTemplate = await fs.promises.readFile(this.tplPath + this.tplMain, "utf8");
        //this.htmlReportTemplate = this.htmlReportTemplate.replace(/\r|\n/g, '');

        this.nunjucksEnv = nunjucks.configure(this.tplPath, {
            autoescape: false,
            trimBlocks: true
          });

          this.nunjucksEnv.addGlobal('formatDateTimeFriendly', this.formatDateTimeFriendly)
    }

    formatDateTimeFriendly(date: Date): string {
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true 
    };
      return date.toLocaleString('en-US', options);
  }

    render(issue: ServiceIssue) {
        let htmlReport = this.nunjucksEnv.renderString(this.htmlReportTemplate, issue);
      return htmlReport;
    }
}



