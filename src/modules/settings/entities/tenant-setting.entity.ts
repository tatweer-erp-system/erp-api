import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { SettingValueType } from '@/common/enums/settings.enums';

@Entity({ name: 'tenant_settings', schema: 'public' })
export class TenantSetting extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'varchar', length: 100, nullable: false, default: 'general' })
  group: string;

  @Column({
    type: 'enum',
    enum: SettingValueType,
    nullable: false,
    default: SettingValueType.STRING,
  })
  type: SettingValueType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
