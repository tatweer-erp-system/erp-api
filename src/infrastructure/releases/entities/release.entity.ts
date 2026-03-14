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

@Table({
  tableName: 'releases',
  timestamps: true,
  paranoid: true,
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
    validate: { isIn: [Object.values(ReleaseType)] },
  })
  type!: ReleaseType;

  @Column({ type: DataType.STRING(500), allowNull: false })
  titleEn!: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  titleAr!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  descriptionEn!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  descriptionAr!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  changes!: ReleaseChangeJson[];

  @Column({ type: DataType.JSONB, allowNull: true })
  tour!: TourStepJson[] | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isPublished!: boolean;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;

  @DeletedAt
  @Column({ type: DataType.DATE })
  deletedAt!: Date | null;

  @BeforeCreate
  static generateUUID(instance: Release) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
