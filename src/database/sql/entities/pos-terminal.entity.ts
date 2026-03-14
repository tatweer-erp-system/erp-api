import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'pos_terminals',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PosTerminal extends TenantAwareEntity<PosTerminal> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  settings!: Record<string, unknown>;

  @Column({ type: DataType.DATE, allowNull: true })
  lastSeenAt!: Date | null;
}
