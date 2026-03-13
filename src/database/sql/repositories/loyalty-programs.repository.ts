import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LoyaltyProgram } from '../entities/loyalty-program.entity';

@Injectable()
export class LoyaltyProgramsRepository extends BaseRepository<LoyaltyProgram> {
  constructor() {
    super(LoyaltyProgram, true);
  }
}
