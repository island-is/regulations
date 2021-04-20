import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type regulationarticleAttributes = {
  articleid: number;
  title: string;
  article?: string;
  summary?: string;
  externalsource?: string;
  status?: number;
  statustext?: string;
  officialname?: string;
  signaturedate?: string;
  publisheddate?: string;
  effectivedate?: string;
  articletypeid?: number;
  articletypename?: string;
  legacyimportid?: string;
  slug?: string;
};

@Table({ tableName: 'regulationarticle', timestamps: false })
export class regulationarticle
  extends Model<regulationarticleAttributes, regulationarticleAttributes>
  implements regulationarticleAttributes {
  @Column({ type: DataType.BIGINT })
  articleid!: number;

  @Column({ type: DataType.STRING })
  title!: string;

  @Column({ allowNull: true, type: DataType.STRING })
  article?: string;

  @Column({ allowNull: true, type: DataType.STRING })
  summary?: string;

  @Column({ allowNull: true, type: DataType.STRING })
  externalsource?: string;

  @Column({ allowNull: true, type: DataType.SMALLINT })
  status?: number;

  @Column({ allowNull: true, type: DataType.STRING(201) })
  statustext?: string;

  @Column({ allowNull: true, type: DataType.STRING(201) })
  officialname?: string;

  @Column({ allowNull: true, type: DataType.DATEONLY })
  signaturedate?: string;

  @Column({ allowNull: true, type: DataType.DATEONLY })
  publisheddate?: string;

  @Column({ allowNull: true, type: DataType.DATEONLY })
  effectivedate?: string;

  @Column({ allowNull: true, type: DataType.BIGINT })
  articletypeid?: number;

  @Column({ allowNull: true, type: DataType.STRING(201) })
  articletypename?: string;

  @Column({ allowNull: true, type: DataType.STRING(101) })
  legacyimportid?: string;

  @Column({ allowNull: true, type: DataType.STRING(400) })
  slug?: string;
}
