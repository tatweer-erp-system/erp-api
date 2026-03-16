import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sequence } from '@/database/sql/entities/sequence.entity';
import { SequencesRepository } from '@/database/sql/repositories/sequences.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sequence])],
  providers: [SequencesRepository],
  exports: [SequencesRepository],
})
export class SequencesModule {}
