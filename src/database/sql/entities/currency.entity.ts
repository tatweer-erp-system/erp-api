import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({ tableName: 'currencies', paranoid: true, timestamps: true })
export class Currency extends Model {
  @PrimaryKey
  @Default(() => uuidv7())
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare tenantId: string;

  @AllowNull(false)
  @Column(DataType.STRING(3))
  declare code: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare nameEn: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare nameAr: string;

  @AllowNull(false)
  @Column(DataType.STRING(10))
  declare symbol: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isBase: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @Default(2)
  @Column(DataType.INTEGER)
  declare decimalPlaces: number;
}
