import { Module } from '@nestjs/common';
import { ContactsController } from './controllers/contacts.controller';
import { ContactsService } from './services/contacts.service';
import { LeadsController } from './controllers/leads.controller';
import { LeadsService } from './services/leads.service';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [ContactsController, LeadsController, SalesOrdersController],
  providers: [ContactsService, LeadsService, SalesOrdersService, SequencesService],
  exports: [ContactsService, LeadsService, SalesOrdersService],
})
export class CrmModule {}
