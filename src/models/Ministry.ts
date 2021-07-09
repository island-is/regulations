import { MinistrySlug } from 'routes/types';
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
  slug: MinistrySlug;
  name: string;
  current: boolean;
  order?: number;
};

@Table({ tableName: 'Ministry', timestamps: false })
export class DB_Ministry
  extends Model<MinistryAttributes, MinistryAttributes>
  implements MinistryAttributes
{
  @Column({ primaryKey: true, type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING(8) })
  slug!: MinistrySlug;

  @Column({ type: DataType.STRING(128) })
  name!: string;

  @Column({ type: DataType.BOOLEAN })
  current!: boolean;

  @Column({ allowNull: true, type: DataType.INTEGER })
  order?: number;
}
