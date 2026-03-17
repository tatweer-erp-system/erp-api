import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { EmailTemplate } from '../entities/email-template.entity';

@Injectable()
export class EmailTemplatesRepository extends BaseRepository<EmailTemplate> {
  constructor() {
    super(EmailTemplate, true);
  }
}
