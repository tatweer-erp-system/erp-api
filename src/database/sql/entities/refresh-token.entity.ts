import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Index() @Column({ type: 'varchar', length: 512 }) token: string;
  @Column({ type: 'timestamptz', name: 'expires_at' }) expiresAt: Date;
  @Column({ type: 'boolean', name: 'is_revoked', default: false }) isRevoked: boolean;
  @Column({ type: 'varchar', length: 255, name: 'device_info', nullable: true }) deviceInfo:
    | string
    | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
