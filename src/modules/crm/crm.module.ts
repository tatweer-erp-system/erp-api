import { Module } from '@nestjs/common';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';
import { LeadsController } from './leads/leads.controller';
import { LeadsService } from './leads/leads.service';
import { SalesOrdersController } from './sales-orders/sales-orders.controller';
import { SalesOrdersService } from './sales-orders/sales-orders.service';

@Module({
  controllers: [ContactsController, LeadsController, SalesOrdersController],
  providers: [ContactsService, LeadsService, SalesOrdersService],
  exports: [ContactsService, LeadsService, SalesOrdersService],
})
export class CrmModule {}
