import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' }) nameEn: string;
  @Column({ type: 'varchar', length: 255, name: 'name_ar' }) nameAr: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;
  @Column({ type: 'varchar', length: 255 }) password: string;
  @Column({ type: 'uuid', name: 'branch_id', nullable: true }) branchId: string | null; // null = company admin
  @Column({ type: 'boolean', name: 'is_active', default: true }) isActive: boolean;
  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true }) lastLoginAt: Date | null;
  @Column({ type: 'simple-array', name: 'extra_permissions', nullable: true }) extraPermissions:
    | string[]
    | null;
  @Column({ type: 'simple-array', name: 'revoked_permissions', nullable: true })
  revokedPermissions: string[] | null;
}
