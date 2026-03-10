import { Module } from '@nestjs/common';
import { ContactsController } from './controllers/contacts.controller';
import { ContactsService } from './services/contacts.service';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { LeadsController } from './controllers/leads.controller';
import { LeadsService } from './services/leads.service';
import { LeadsRepository } from '../../database/repositories/leads.repository';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SalesOrdersRepository } from '../../database/repositories/sales-orders.repository';
import { SalesOrderLinesRepository } from '../../database/repositories/sales-order-lines.repository';

@Module({
  controllers: [ContactsController, LeadsController, SalesOrdersController],
  providers: [
    ContactsService,
    ContactsRepository,
    LeadsService,
    LeadsRepository,
    SalesOrdersService,
    SalesOrdersRepository,
    SalesOrderLinesRepository,
  ],
  exports: [ContactsService, LeadsService, SalesOrdersService],
})
export class CrmModule {}
