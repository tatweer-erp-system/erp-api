import { Module } from '@nestjs/common';
import { SequencesController } from './controllers/sequences.controller';
import { SequencesService } from './services/sequences.service';

@Module({
  controllers: [SequencesController],
  providers: [SequencesService],
  exports: [SequencesService],
})
export class SequencesModule {}
