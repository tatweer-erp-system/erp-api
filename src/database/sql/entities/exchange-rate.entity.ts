import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
} from 'sequelize-typescript';
import { Currency } from './currency.entity';

@Table({ tableName: 'exchange_rates', timestamps: true, paranoid: false })
export class ExchangeRate extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare tenantId: string;

  @ForeignKey(() => Currency)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare fromCurrencyId: string;

  @ForeignKey(() => Currency)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare toCurrencyId: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(15, 6))
  declare rate: number;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare rateDate: string;

  @Default('manual')
  @Column(DataType.STRING(20))
  declare source: string;
}
