import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type MinistryAttributes = {
  id: number;
  slug: string;
  name: string;
  current: number;
  order?: number;
};

@Table({ tableName: 'Ministry', timestamps: false })
export class Ministry
  extends Model<MinistryAttributes, MinistryAttributes>
  implements MinistryAttributes {
  @Column({ primaryKey: true, type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING(8) })
  slug!: string;

  @Column({ type: DataType.STRING(128) })
  name!: string;

  @Column({ type: DataType.TINYINT })
  current!: number;

  @Column({ allowNull: true, type: DataType.INTEGER })
  order?: number;
}
