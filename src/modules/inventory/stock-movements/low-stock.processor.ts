import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_INVENTORY } from '../../../infrastructure/queues/queue.constants';
import { NotificationsService } from '../../notifications/notifications.service';

export interface LowStockJobData {
  tenantSlug: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  reorderPoint: number;
  warehouseId: string;
}

@Processor(QUEUE_INVENTORY)
export class LowStockProcessor {
  private readonly logger = new Logger(LowStockProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('low-stock-alert')
  async handleLowStock(job: Job<LowStockJobData>): Promise<void> {
    const { tenantSlug, productName, currentQuantity, reorderPoint } = job.data;
    this.logger.warn(`Low stock alert: ${productName} - qty: ${currentQuantity} / reorder: ${reorderPoint}`);
  }
}
