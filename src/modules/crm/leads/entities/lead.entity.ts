import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, DeletedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'leads', timestamps: true, paranoid: true, underscored: true })
export class Lead extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @Column({ type: DataType.STRING(255), allowNull: false }) title!: string;
  @Column({ type: DataType.UUID, allowNull: true, field: 'contact_id' }) contactId!: string | null;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true }) value!: number | null;
  @Column({ type: DataType.STRING(10), defaultValue: 'USD' }) currency!: string;
  @Column({ type: DataType.STRING(50), defaultValue: 'new' }) status!: string;
  @Column({ type: DataType.STRING(50), defaultValue: 'medium' }) priority!: string;
  @Column({ type: DataType.UUID, allowNull: true, field: 'assigned_to' }) assignedTo!: string | null;
  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'expected_close_date' }) expectedCloseDate!: string | null;
  @Column({ type: DataType.TEXT, allowNull: true }) notes!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' }) createdBy!: string | null;
  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' }) updatedBy!: string | null;
  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
