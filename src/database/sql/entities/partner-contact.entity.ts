import { Column, DataType, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { Partner } from './partner.entity';

@Table({
  tableName: 'partner_contacts',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PartnerContact extends TenantAwareEntity<PartnerContact> {
  @ForeignKey(() => Partner)
  @Column({ type: DataType.UUID, allowNull: false })
  partnerId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  firstName!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  lastName!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  mobile!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  position!: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isMain!: boolean;

  @BelongsTo(() => Partner)
  partner!: Partner;
}
