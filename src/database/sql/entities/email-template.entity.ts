import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'email_templates',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class EmailTemplate extends TenantAwareEntity<EmailTemplate> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  model!: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  subject!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  bodyEn!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  bodyAr!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  fromEmail!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  replyTo!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  autoAttachPdf!: boolean;

  @Column({ type: DataType.STRING(500), allowNull: true })
  ccEmails!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDefault!: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
