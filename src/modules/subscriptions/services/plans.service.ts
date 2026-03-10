import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Plan } from '../../../database/entities/plan.entity';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan) private readonly planModel: typeof Plan) {}

  findAll(): Promise<Plan[]> {
    return this.planModel.findAll({ order: [['sortOrder', 'ASC']] });
  }

  findAllActive(): Promise<Plan[]> {
    return this.planModel.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.planModel.findByPk(id);
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  async findBySlug(slug: string): Promise<Plan> {
    const plan = await this.planModel.findOne({ where: { slug } });
    if (!plan) throw new NotFoundException(`Plan '${slug}' not found`);
    return plan;
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.planModel.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Plan slug '${dto.slug}' already exists`);
    return this.planModel.create({
      slug: dto.slug,
      name: dto.name,
      description: dto.description ?? null,
      monthlyPrice: dto.monthlyPrice,
      annualPrice: dto.annualPrice,
      currency: dto.currency ?? 'SAR',
      modules: dto.modules,
      maxUsers: dto.maxUsers ?? null,
      features: dto.features ?? {},
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    } as Partial<Plan>);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);
    await plan.update(dto);
    return plan;
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await plan.destroy();
  }
}
