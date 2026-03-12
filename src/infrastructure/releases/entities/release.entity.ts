import {
  Column,
  CreatedAt,
  DataType,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  BeforeCreate,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

export interface ReleaseChangeJson {
  category: 'feature' | 'improvement' | 'fix' | 'breaking';
  text: { en: string; ar: string };
}

export interface TourStepJson {
  target: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

@Table({
  tableName: 'releases',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Release extends Model<Release> {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  version!: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    validate: { isIn: [['major', 'minor', 'patch', 'hotfix']] },
  })
  type!: 'major' | 'minor' | 'patch' | 'hotfix';

  @Column({ type: DataType.STRING(500), allowNull: false, field: 'title_en' })
  titleEn!: string;

  @Column({ type: DataType.STRING(500), allowNull: false, field: 'title_ar' })
  titleAr!: string;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'description_en' })
  descriptionEn!: string;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'description_ar' })
  descriptionAr!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  changes!: ReleaseChangeJson[];

  @Column({ type: DataType.JSONB, allowNull: true })
  tour!: TourStepJson[] | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_published' })
  isPublished!: boolean;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  @DeletedAt
  @Column({ type: DataType.DATE, field: 'deleted_at' })
  deletedAt!: Date | null;

  @BeforeCreate
  static generateUUID(instance: Release) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
