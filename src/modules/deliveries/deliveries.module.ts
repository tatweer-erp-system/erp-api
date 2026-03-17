import { Module } from '@nestjs/common';
import { DeliveriesController } from './controllers/deliveries.controller';
import { DeliveriesService } from './services/deliveries.service';
import { DeliveriesRepository } from '@/database/sql/repositories/deliveries.repository';
import { DeliveryLinesRepository } from '@/database/sql/repositories/delivery-lines.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveriesRepository, DeliveryLinesRepository, SequencesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
