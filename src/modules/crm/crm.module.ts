import { Module } from '@nestjs/common';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';
import { ContactsRepository } from './contacts/contacts.repository';
import { LeadsController } from './leads/leads.controller';
import { LeadsService } from './leads/leads.service';
import { LeadsRepository } from './leads/leads.repository';
import { SalesOrdersController } from './sales-orders/sales-orders.controller';
import { SalesOrdersService } from './sales-orders/sales-orders.service';
import { SalesOrdersRepository } from './sales-orders/sales-orders.repository';
import { SalesOrderLinesRepository } from './sales-orders/sales-order-lines.repository';

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
