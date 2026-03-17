import { Module } from '@nestjs/common';
import { EmailTemplatesController } from './controllers/email-templates.controller';
import { EmailTemplatesService } from './services/email-templates.service';

@Module({
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [],
})
export class EmailTemplatesModule {}
