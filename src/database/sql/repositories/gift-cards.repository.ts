import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { GiftCard } from '../entities/gift-card.entity';

@Injectable()
export class GiftCardsRepository extends BaseRepository<GiftCard> {
  constructor() {
    super(GiftCard, true);
  }
}
