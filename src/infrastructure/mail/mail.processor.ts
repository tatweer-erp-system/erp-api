import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { QUEUE_MAIL } from '../queues/queue.constants';
import { MailJobData } from './mail.service';

@Processor(QUEUE_MAIL)
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  @Process('send')
  async handleSend(job: Job<MailJobData>): Promise<void> {
    const { to, subject, template, context } = job.data;
    try {
      const html = this.renderTemplate(template, context);
      await this.transporter.sendMail({
        from: this.configService.get<string>('mail.from'),
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      throw err;
    }
  }

  private renderTemplate(templateName: string, context: Record<string, unknown>): string {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      return `<p>${JSON.stringify(context)}</p>`;
    }
    const source = fs.readFileSync(templatePath, 'utf8');
    const compiled = handlebars.compile(source);
    return compiled(context);
  }
}
