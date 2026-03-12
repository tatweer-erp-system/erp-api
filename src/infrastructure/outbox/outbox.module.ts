import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { OutboxProcessor } from './outbox.processor';
import {
  SalesOrderEventHandler,
  PurchaseOrderEventHandler,
  LeaveRequestEventHandler,
  StockAlertHandler,
  EmployeeEventHandler,
  LeadEventHandler,
  StockAlertUtil,
} from './handlers';

const handlers = [
  SalesOrderEventHandler,
  PurchaseOrderEventHandler,
  LeaveRequestEventHandler,
  StockAlertHandler,
  EmployeeEventHandler,
  LeadEventHandler,
  StockAlertUtil,
];

@Module({})
export class OutboxModule {
  private static readonly logger = new Logger(OutboxModule.name);

  static forRoot(): DynamicModule {
    const queuesEnabled = process.env.QUEUES_ENABLED === 'true';

    const providers: any[] = [...handlers];

    if (queuesEnabled) {
      providers.push(OutboxProcessor);
    } else {
      this.logger.warn('Queues disabled – outbox processor will not run');
    }

    return {
      module: OutboxModule,
      global: true,
      providers,
      exports: [...handlers],
    };
  }
}
