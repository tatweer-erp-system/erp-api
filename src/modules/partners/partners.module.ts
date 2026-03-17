import { Module } from '@nestjs/common';
import { PartnersController } from './controllers/partners.controller';
import { PartnersService } from './services/partners.service';
import { PartnerContactsController } from './controllers/partner-contacts.controller';
import { PartnerContactsService } from './services/partner-contacts.service';

@Module({
  controllers: [PartnersController, PartnerContactsController],
  providers: [PartnersService, PartnerContactsService],
  exports: [PartnersService],
})
export class PartnersModule {}
