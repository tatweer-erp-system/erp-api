import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'branch_products' })
@Index(['branchId', 'productId'], { unique: true })
export class BranchProduct {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'branch_id' }) branchId: string;
  @Column({ type: 'uuid', name: 'product_id' }) productId: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
