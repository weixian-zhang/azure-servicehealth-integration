import * as nunjucks from 'nunjucks'
import {Environment} from 'nunjucks';
import * as fs from 'fs';
import { ServiceIssue } from '../issue-api/ServiceIssueModels';
import AppConfig from '../AppConfig';
import Path from 'path';
import {convert} from 'html-to-text'

// https://mozilla.github.io/nunjucks/templating.html
export default class ReportRenderer {
    private tplPath = __dirname;
    private html_tpl_file_name = "html-incident-report.njk";
    private slack_mrkdown_tpl_file_name = "slack-mrkdown-incident-report.njk";
    private nunjucksEnv: Environment = null;
    private template: string = '';
    private appconfig: AppConfig;

    
    public async init(appconfig: AppConfig) {

        this.appconfig = appconfig;

        if (this.appconfig.TemplateOutput == 'slack') {
          this.template = await fs.promises.readFile(Path.join(this.tplPath, this.slack_mrkdown_tpl_file_name), "utf8");
        }
        else {
          this.template = await fs.promises.readFile(Path.join(this.tplPath, this.html_tpl_file_name), "utf8");
        }

        //this.template = this.template.replace(/\r|\n/g, '');

        this.nunjucksEnv = nunjucks.configure(this.tplPath, {
            autoescape: false,
            trimBlocks: true,
          
          });

        this.nunjucksEnv.addGlobal('formatDateTimeFriendly', this.formatDateTimeFriendly)
        this.nunjucksEnv.addGlobal('html_to_text', this.html_to_text)
    }

    formatDateTimeFriendly(date: Date): string {
      // const options: Intl.DateTimeFormatOptions = { 
      //   year: 'numeric', 
      //   month: 'long', 
      //   day: 'numeric', 
      //   hour: 'numeric', 
      //   minute: 'numeric',
      //   hour12: true,
      //   timeZone: 'Asian/Singapore'
      // };

      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Singapore'
      });
    }

    html_to_text(html: string): string {
      const options = {
        wordwrap: 130
      };
      const text = convert(html, options);
      return text;
    }

    render(issue: ServiceIssue) {
        let report = this.nunjucksEnv.renderString(this.template, issue);
        return report;
    }
}



