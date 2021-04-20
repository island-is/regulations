import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type RegulationChangeAttributes = {
  id?: number;
  regulationId: number;
  changingId: number;
  date: string;
  text: string;
  changeset: string;
};

@Table({ tableName: 'RegulationChange', timestamps: false })
export class RegulationChange
  extends Model<RegulationChangeAttributes, RegulationChangeAttributes>
  implements RegulationChangeAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id?: number;

  @Column({
    type: DataType.INTEGER,
    comment: 'Id of the source regulation prescribing the change',
  })
  regulationId!: number;

  @Column({
    type: DataType.INTEGER,
    comment: 'Id of the target regulation being changed',
  })
  changingId!: number;

  @Column({ type: DataType.DATEONLY, comment: 'the "effectiveDate" of the change' })
  date!: string;

  @Column({ type: DataType.STRING, comment: 'Regulation text after applying change' })
  text!: string;

  @Column({
    type: DataType.STRING,
    comment:
      'Changeset (diff) from changing regulation to the previous version of the regulation text',
  })
  changeset!: string;
}
