import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';

@Table({
  tableName: 'branch_products',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class BranchProduct extends TenantAwareEntity<BranchProduct> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  productId!: string;
}
