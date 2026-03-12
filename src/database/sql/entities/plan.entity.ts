import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'plans',
  schema: 'public',
  timestamps: true,
  underscored: true,
  paranoid: false,
})
export class Plan extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id!: number;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  slug!: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  name!: { en: string; ar: string };

  @Column({ type: DataType.JSONB, allowNull: true })
  description!: { en: string; ar: string } | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'monthly_price',
  })
  monthlyPrice!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'annual_price',
  })
  annualPrice!: number;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'SAR' })
  currency!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  modules!: string[];

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'max_users' })
  maxUsers!: number | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  features!: Record<string, boolean | string | number>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder!: number;

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
