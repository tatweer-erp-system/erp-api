import { Injectable } from '@nestjs/common';
import { PermissionsRepository } from '@/database/sql/repositories/permissions.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;

    const { rows, total } = await this.permissionsRepository.findAllPaginated(tenantId, {
      page,
      limit,
      search: query.search,
    });

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getByModule(tenantId: string, module: string) {
    return this.permissionsRepository.findByModule(tenantId, module);
  }
}
