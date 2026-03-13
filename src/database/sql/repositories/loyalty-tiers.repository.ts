import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { LoyaltyTier } from '../entities/loyalty-tier.entity';

@Injectable()
export class LoyaltyTiersRepository extends BaseRepository<LoyaltyTier> {
  constructor() {
    super(LoyaltyTier, false);
  }
}
