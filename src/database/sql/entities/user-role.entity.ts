import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'user_roles' })
@Index(['userId', 'roleId', 'branchId'], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'uuid', name: 'role_id' }) roleId: string;
  @Column({ type: 'uuid', name: 'branch_id', nullable: true }) branchId: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
