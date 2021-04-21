import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

import { ISODate } from '../routes/types';

type RegulationCancelAttributes = {
  id: number;
  regulationId: number;
  changingId: number;
  date: ISODate;
};

@Table({ tableName: 'RegulationCancel', timestamps: false })
export class DB_RegulationCancel
  extends Model<RegulationCancelAttributes, RegulationCancelAttributes>
  implements RegulationCancelAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number;

  @Column({
    type: DataType.INTEGER,
    comment: 'Id of the target regulation being cancelled',
  })
  regulationId!: number;

  @Column({
    type: DataType.INTEGER,
    comment: 'Id of the source regulation prescribing the cancellation',
  })
  changingId!: number;

  @Column({ type: DataType.DATEONLY, comment: 'the "effectiveDate" of the cancellation' })
  date!: ISODate;
}
