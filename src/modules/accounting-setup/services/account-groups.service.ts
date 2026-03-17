import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { AccountGroupsRepository } from '@/database/sql/repositories/account-groups.repository';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { CreateAccountGroupDto } from '../dto/create-account-group.dto';
import { UpdateAccountGroupDto } from '../dto/update-account-group.dto';

@Injectable()
export class AccountGroupsService {
  constructor(private readonly accountGroupsRepository: AccountGroupsRepository) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.accountGroupsRepository.findAll({
      tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr', 'codePrefix'],
      sortBy: query.sortBy ?? 'codePrefix',
      sortOrder: query.sortOrder ?? 'ASC',
    });
  }

  async findById(tenantId: string, id: string) {
    return this.accountGroupsRepository.findById(id, { tenantId });
  }

  async getTree(tenantId: string) {
    const flat = await this.accountGroupsRepository.getTree(tenantId);
    return this.buildTree(flat);
  }

  async create(tenantId: string, dto: CreateAccountGroupDto, auditContext: AuditContext) {
    const exists = await this.accountGroupsRepository.existsByCodePrefix(tenantId, dto.codePrefix);
    if (exists) {
      throw new ConflictException(
        msg(ErrorMessages.ACCOUNT_GROUP_CODE_PREFIX_DUPLICATE, dto.codePrefix),
      );
    }

    return this.accountGroupsRepository.create(
      {
        codePrefix: dto.codePrefix,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        parentId: dto.parentId ?? null,
      } as any,
      { tenantId, auditContext },
    );
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAccountGroupDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.accountGroupsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.ACCOUNT_GROUP_NOT_FOUND, id));

    if (dto.codePrefix) {
      const record = existing as unknown as Record<string, unknown>;
      if (dto.codePrefix !== record.codePrefix) {
        const duplicate = await this.accountGroupsRepository.existsByCodePrefix(
          tenantId,
          dto.codePrefix,
        );
        if (duplicate) {
          throw new ConflictException(
            msg(ErrorMessages.ACCOUNT_GROUP_CODE_PREFIX_DUPLICATE, dto.codePrefix),
          );
        }
      }
    }

    const { version: _version, ...updateData } = dto;
    return this.accountGroupsRepository.update(id, updateData as any, { tenantId, auditContext });
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.accountGroupsRepository.findByIdOrNull(id, { tenantId });
    if (!existing) throw new NotFoundException(msg(ErrorMessages.ACCOUNT_GROUP_NOT_FOUND, id));

    await this.accountGroupsRepository.softDelete(id, { tenantId, auditContext });
  }

  private buildTree(
    flat: Record<string, unknown>[],
    parentId: string | null = null,
  ): Record<string, unknown>[] {
    return flat
      .filter((node) => (node.parentId ?? null) === parentId)
      .map((node) => ({
        ...node,
        children: this.buildTree(flat, node.id as string),
      }));
  }
}
