import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

import { HTMLText, ISODate, RegName } from '../routes/types';

type RegulationAttributes = {
  id: number;
  title: string;
  name: RegName;
  text: HTMLText;
  signatureDate: ISODate;
  publishedDate: ISODate;
  effectiveDate: ISODate;
  updateStatus?: '' | '-1' | '0' | '1' | '2' | '3';
  updateComment?: string;
  status?: 'raw' | 'unsafe' | 'draft' | 'text_locked' | 'migrated';
  type?: 'base' | 'amending' | 'repealing';
  repealedDate?: ISODate;
};

@Table({ tableName: 'Regulation', timestamps: false })
export class Regulation
  extends Model<RegulationAttributes, RegulationAttributes>
  implements RegulationAttributes {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.INTEGER,
    comment: 'migrated as-is from old table',
  })
  id!: number;

  @Column({
    type: DataType.STRING,
    comment: 'html encoding fixes of title from old table before migration\n',
  })
  title!: string;

  @Column({ type: DataType.STRING(9), comment: 'migrated as-is from old table' })
  name!: RegName;

  @Column({ type: DataType.STRING, comment: 'migrated as-is from old table' })
  text!: HTMLText;

  @Column({ type: DataType.DATEONLY, comment: 'migrated as-is from old table' })
  signatureDate!: ISODate;

  @Column({ type: DataType.DATEONLY, comment: 'migrated as-is from old table' })
  publishedDate!: ISODate;

  @Column({
    allowNull: true,
    type: DataType.STRING(128),
    comment: 'migrated as-is from old table, metadata',
  })
  _legacyimportid?: string;

  @Column({
    allowNull: true,
    type: DataType.STRING,
    comment: 'migrated as-is from old table, metadata',
  })
  _externalsource?: string;

  @Column({
    type: DataType.DATEONLY,
    comment:
      'migrated as-is from old table. NOTE: Regulation.effectiveDate and RegulationChange.date are NOT the same thing, though they are often the same value',
  })
  effectiveDate!: ISODate;

  @Column({
    allowNull: true,
    type: DataType.ENUM('', '-1', '0', '1', '2', '3'),
    comment:
      'Status of regulation after manual processing:\n-1 = Duplicate\n0  = Ekki regluger\u00F0\n1  = \u00D3sta\u00F0festar dags\n2  = Eitthva\u00F0 spes\n3  = Brottfelld en ekki merkt \u00FEannig\n\n',
  })
  updateStatus?: '' | '-1' | '0' | '1' | '2' | '3';

  @Column({ allowNull: true, type: DataType.STRING(512) })
  updateComment?: string;

  @Column({
    type: DataType.ENUM('raw', 'unsafe', 'draft', 'text_locked', 'migrated'),
    comment: 'Status of regulation after manual processing',
  })
  status!: 'raw' | 'unsafe' | 'draft' | 'text_locked' | 'migrated';

  @Column({
    type: DataType.ENUM('base', 'amending', 'repealing'),
    comment:
      'Type of regulation, base (stofn) or amending (breytingar), base can still amend tho. We do not mark it as repealed here since that would lose the type',
  })
  type!: 'base' | 'amending' | 'repealing';

  @Column({
    allowNull: true,
    type: DataType.DATEONLY,
    comment: 'when regulation was repealed or will be repealed',
  })
  repealedDate?: ISODate;
}
