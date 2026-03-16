import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { ReleaseNoteType, TooltipPosition, ReleaseType } from '@/common/enums/release.enums';

export interface ReleaseChangeJson {
  type: ReleaseNoteType;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
}

export interface TourStepJson {
  target: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  placement?: TooltipPosition;
}

@Entity({ name: 'releases', schema: 'public' })
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  version: string;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  type: ReleaseType;

  @Column({ type: 'varchar', length: 500, name: 'title_en', nullable: false })
  titleEn: string;

  @Column({ type: 'varchar', length: 500, name: 'title_ar', nullable: false })
  titleAr: string;

  @Column({ type: 'text', name: 'description_en', nullable: false })
  descriptionEn: string;

  @Column({ type: 'text', name: 'description_ar', nullable: false })
  descriptionAr: string;

  @Column({ type: 'jsonb', nullable: false, default: [] })
  changes: ReleaseChangeJson[];

  @Column({ type: 'jsonb', nullable: true })
  tour: TourStepJson[] | null;

  @Column({ type: 'boolean', name: 'is_published', nullable: false, default: false })
  isPublished: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
