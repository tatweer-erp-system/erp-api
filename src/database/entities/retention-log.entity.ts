import { Column, DataType, Table, Default, PrimaryKey, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'retention_logs', timestamps: false, paranoid: false, underscored: true })
export class RetentionLog extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, field: 'data_type' })
  dataType!: string; // 'audit_logs' | 'notifications' | 'soft_deleted_records' | etc.

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'records_purged' })
  recordsPurged!: number;

  @Column({ type: DataType.DATE, allowNull: false, field: 'purged_at' })
  purgedAt!: Date;
}
