import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'plans',
  schema: 'public',
  timestamps: true,
  paranoid: false,
})
export class Plan extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  slug!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameEn!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  nameAr!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionEn!: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  descriptionAr!: string | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  monthlyPrice!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  annualPrice!: number;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  modules!: string[];

  @Column({ type: DataType.INTEGER, allowNull: true })
  maxUsers!: number | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  features!: Record<string, boolean | string | number>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sortOrder!: number;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
