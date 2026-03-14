import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'shifts',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Shift extends TenantAwareEntity<Shift> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  startTime!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  endTime!: string;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 60 })
  breakMinutes!: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isOvernight!: boolean;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: [1, 2, 3, 4, 5] })
  workingDays!: number[];

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;
}
