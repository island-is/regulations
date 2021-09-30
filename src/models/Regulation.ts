import { Model, Table, Column, DataType } from 'sequelize-typescript';

import { HTMLText, ISODate, PlainText, RegName } from '../routes/types';

type RegulationAttributes = {
  id: number;
  title: string;
  name: RegName;
  text: HTMLText;
  signatureDate: ISODate;
  publishedDate: ISODate;
  effectiveDate: ISODate;
  updateComment?: string;
  status: 'raw' | 'unsafe' | 'draft' | 'text_locked' | 'migrated';
  type?: 'base' | 'amending';
  ministryId?: number;
  _externalsource?: string;
};

@Table({ tableName: 'Regulation', timestamps: false })
export class DB_Regulation
  extends Model<RegulationAttributes, RegulationAttributes>
  implements RegulationAttributes
{
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.INTEGER,
    comment: 'migrated as-is from old table',
  })
  id!: number;

  @Column({
    type: DataType.STRING,
    comment: 'html encoding fixes of title from old table before migration',
  })
  title!: PlainText;

  @Column({
    type: DataType.STRING(9),
    comment: 'migrated as-is from old table',
  })
  name!: RegName;

  @Column({ type: DataType.STRING, comment: 'migrated as-is from old table' })
  text!: HTMLText;

  @Column({ type: DataType.DATEONLY, comment: 'migrated as-is from old table' })
  signatureDate!: ISODate;

  @Column({ type: DataType.DATEONLY, comment: 'migrated as-is from old table' })
  publishedDate!: ISODate;

  @Column({
    type: DataType.DATEONLY,
    comment:
      'migrated as-is from old table. NOTE: Regulation.effectiveDate and RegulationChange.date are NOT the same thing, though they are often the same value',
  })
  effectiveDate!: ISODate;

  @Column({
    type: DataType.ENUM('raw', 'unsafe', 'draft', 'text_locked', 'migrated'),
    comment: 'Status of regulation after manual processing',
  })
  status!: 'raw' | 'unsafe' | 'draft' | 'text_locked' | 'migrated';

  @Column({
    type: DataType.ENUM('base', 'amending'),
    comment:
      'Type of regulation, base (stofn) or amending (breytingar), base can still amend tho.',
  })
  type!: 'base' | 'amending';

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'The ministry this Regulation belongs to',
  })
  ministryId?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  _externalsource?: string;
}
