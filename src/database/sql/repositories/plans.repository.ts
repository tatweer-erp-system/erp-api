import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Plan } from '../entities/plan.entity';

@Injectable()
export class PlansRepository extends BaseRepository<Plan> {
  constructor() {
    super(Plan, false);
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    return this.findOne({ where: { slug } });
  }
}
