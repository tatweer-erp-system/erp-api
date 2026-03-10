import { Injectable } from '@nestjs/common';
import { Sequelize, Op } from 'sequelize';
import { BaseRepository } from '../../../database/base.repository';
import { Department } from '../../../database/entities/department.entity';

@Injectable()
export class DepartmentsRepository extends BaseRepository<Department> {
  constructor() {
    super(Department);
  }

  async findByName(name: string): Promise<Department | null> {
    return this.findOne({
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('name'), 'en'),
            name,
          ),
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('name'), 'ar'),
            name,
          ),
        ],
      },
    });
  }

  async existsByName(name: string): Promise<boolean> {
    const department = await this.findByName(name);
    return department !== null;
  }
}
