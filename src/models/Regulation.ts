import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type RegulationAttributes = {
  id?: number;
  title: string;
  name: string;
  text: string;
  signatureDate: string;
  updatedSignatureDateTemp?: string;
  publishedDate: string;
  updatedPublishedDateTemp?: string;
  _legacyimportid?: string;
  _externalsource?: string;
  effectiveDate: string;
  updatedEffectiveDateTemp?: string;
  updateStatus?: string;
  updateComment?: string;
  status: string;
  type: string;
  repealedDate?: string;
  signatureDateUnconfirmed: number;
  publishedDateUnconfirmed: number;
  effectiveDateUnconfirmed: number;
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
  id?: number;

  @Column({
    type: DataType.STRING,
    comment: 'html encoding fixes of title from old table before migration\n',
  })
  title!: string;

  @Column({ type: DataType.STRING(9), comment: 'migrated as-is from old table' })
  name!: string;

  @Column({ type: DataType.STRING, comment: 'migrated as-is from old table' })
  text!: string;

  @Column({ type: DataType.DATEONLY, comment: 'migrated as-is from old table' })
  signatureDate!: string;

  @Column({
    allowNull: true,
    type: DataType.STRING(64),
    comment: 'updated via manual process in spreadsheet',
  })
  updatedSignatureDateTemp?: string;

  @Column({ type: DataType.DATEONLY, comment: 'migrated as-is from old table' })
  publishedDate!: string;

  @Column({
    allowNull: true,
    type: DataType.STRING(64),
    comment: 'updated via manual process in spreadsheet',
  })
  updatedPublishedDateTemp?: string;

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
  effectiveDate!: string;

  @Column({
    allowNull: true,
    type: DataType.STRING(64),
    comment: 'updated via manual process in spreadsheet',
  })
  updatedEffectiveDateTemp?: string;

  @Column({
    allowNull: true,
    type: DataType.ENUM('', '-1', '0', '1', '2', '3'),
    comment:
      'Status of regulation after manual processing:\n-1 = Duplicate\n0  = Ekki regluger\u00F0\n1  = \u00D3sta\u00F0festar dags\n2  = Eitthva\u00F0 spes\n3  = Brottfelld en ekki merkt \u00FEannig\n\n',
  })
  updateStatus?: string;

  @Column({ allowNull: true, type: DataType.STRING(512) })
  updateComment?: string;

  @Column({
    type: DataType.ENUM('raw', 'unsafe', 'draft', 'text_locked', 'migrated'),
    comment: 'Status of regulation after manual processing',
  })
  status!: string;

  @Column({
    type: DataType.ENUM('base', 'amending'),
    comment:
      'Type of regulation, base (stofn) or amending (breytingar), base can still amend tho. We do not mark it as repealed here since that would lose the type',
  })
  type!: string;

  @Column({
    allowNull: true,
    type: DataType.DATEONLY,
    comment: 'when regulation was repealed or will be repealed',
  })
  repealedDate?: string;

  @Column({ type: DataType.TINYINT })
  signatureDateUnconfirmed!: number;

  @Column({ type: DataType.TINYINT })
  publishedDateUnconfirmed!: number;

  @Column({ type: DataType.TINYINT })
  effectiveDateUnconfirmed!: number;
}
