import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type Regulation_MinistryAttributes = {
  id?: number;
  regulationId: number;
  ministryId: number;
};

@Table({ tableName: 'Regulation_Ministry', timestamps: false })
export class Regulation_Ministry
  extends Model<Regulation_MinistryAttributes, Regulation_MinistryAttributes>
  implements Regulation_MinistryAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id?: number;

  @Column({ type: DataType.INTEGER })
  regulationId!: number;

  @Column({ type: DataType.INTEGER })
  ministryId!: number;
}
