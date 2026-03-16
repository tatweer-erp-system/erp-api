import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'admin_notifications' })
export class AdminNotification extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'admin_id' })
  adminId: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'varchar', length: 255, name: 'title_en' })
  titleEn: string;

  @Column({ type: 'varchar', length: 255, name: 'title_ar' })
  titleAr: string;

  @Column({ type: 'text', name: 'body_en', nullable: true })
  bodyEn: string | null;

  @Column({ type: 'text', name: 'body_ar', nullable: true })
  bodyAr: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead: boolean;
}
