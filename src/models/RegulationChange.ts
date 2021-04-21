import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

import { HTMLText, ISODate } from '../routes/types';

type RegulationChangeAttributes = {
  id: number;
  regulationId: number;
  changingId: number;
  date: ISODate;
  text: HTMLText;
  changeset: string;
};

@Table({ tableName: 'RegulationChange', timestamps: false })
export class RegulationChange
  extends Model<RegulationChangeAttributes, RegulationChangeAttributes>
  implements RegulationChangeAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number;

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
  date!: ISODate;

  @Column({ type: DataType.STRING, comment: 'Regulation text after applying change' })
  text!: HTMLText;

  @Column({
    type: DataType.STRING,
    comment:
      'Changeset (diff) from changing regulation to the previous version of the regulation text',
  })
  changeset!: string;
}
