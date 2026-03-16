import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '@/database/sql/entities/permission.entity';
import { RolePermission } from '@/database/sql/entities/role-permission.entity';
import { UserRole } from '@/database/sql/entities/user-role.entity';

@Injectable()
export class PermissionsRepository {
  constructor(
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(UserRole) private readonly urRepo: Repository<UserRole>,
  ) {}

  async findAll() {
    return this.permRepo.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  async findByRoleId(roleId: string): Promise<Permission[]> {
    const rps = await this.rpRepo.find({ where: { roleId } as any });
    if (!rps.length) return [];
    const ids = rps.map((r) => r.permissionId);
    return this.permRepo.createQueryBuilder('p').where('p.id IN (:...ids)', { ids }).getMany();
  }

  async getUserPermissions(userId: string, branchId: string): Promise<string[]> {
    const userRoles = await this.urRepo.find({
      where: [{ userId, branchId } as any, { userId, branchId: null } as any],
    });
    if (!userRoles.length) return [];
    const roleIds = userRoles.map((ur) => ur.roleId);
    const rps = await this.rpRepo
      .createQueryBuilder('rp')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getMany();
    if (!rps.length) return [];
    const permIds = rps.map((rp) => rp.permissionId);
    const perms = await this.permRepo
      .createQueryBuilder('p')
      .where('p.id IN (:...permIds)', { permIds })
      .getMany();
    return perms.map((p) => `${p.module}:${p.action}`);
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    await this.rpRepo.delete({ roleId } as any);
    if (permissionIds.length) {
      const records = permissionIds.map((pid) =>
        this.rpRepo.create({ roleId, permissionId: pid } as any),
      );
      await (this.rpRepo.save as any)(records);
    }
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findAllPaginated(...args: any[]): Promise<any> {
    return (this.findAll as any)(...args);
  }
  async findByModule(..._args: any[]): Promise<any[]> {
    return [];
  }
}
