import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { AttendanceSource, AttendanceStatus } from '@/common/enums/hr.enums';

@Table({
  tableName: 'attendance_records',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class AttendanceRecord extends TenantAwareEntity<AttendanceRecord> {
  @Column({ type: DataType.UUID, allowNull: false })
  employeeId!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  clockIn!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  clockOut!: Date | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: AttendanceStatus.PRESENT,
  })
  status!: string;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  lateMinutes!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  overtimeMinutes!: number | null;

  @Column({ type: DataType.DECIMAL(6, 2), allowNull: true })
  workingHours!: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: AttendanceSource.MANUAL,
  })
  source!: string;
}
