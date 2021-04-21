import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type TaskAttributes = {
  id: number;
  regulationId: number;
  done: number;
  lastEdited: Date;
};

@Table({ tableName: 'Task', timestamps: false })
export class Task
  extends Model<TaskAttributes, TaskAttributes>
  implements TaskAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.INTEGER })
  regulationId!: number;

  @Column({ type: DataType.TINYINT })
  done!: number;

  @Column({ type: DataType.DATE })
  lastEdited!: Date;
}
