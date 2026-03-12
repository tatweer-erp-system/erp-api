import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'contacts',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Contact extends TenantAwareEntity<Contact> {
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' })
  firstName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' })
  lastName!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email!: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  company!: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  position!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({ type: DataType.STRING(20), defaultValue: 'active' })
  status!: string;

  @Column({ type: DataType.UUID, allowNull: true, field: 'assigned_to' })
  assignedTo!: string | null;
}
