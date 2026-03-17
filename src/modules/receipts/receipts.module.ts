import { Module } from '@nestjs/common';
import { ReceiptsController } from './controllers/receipts.controller';
import { ReceiptsService } from './services/receipts.service';
import { ReceiptsRepository } from '@/database/sql/repositories/receipts.repository';
import { ReceiptLinesRepository } from '@/database/sql/repositories/receipt-lines.repository';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptsRepository, ReceiptLinesRepository, SequencesService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
