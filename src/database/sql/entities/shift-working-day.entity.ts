import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'shift_working_days',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class ShiftWorkingDay extends TenantAwareEntity<ShiftWorkingDay> {
  @Column({ type: DataType.UUID, allowNull: false })
  shiftId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  dayOfWeek!: number;
}
