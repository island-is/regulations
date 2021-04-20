import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type AuditLogAttributes = {
  id?: number;
  regulationId: number;
  from: string;
  to: string;
  user: string;
  datetime: Date;
  migrated?: number;
};

@Table({ tableName: 'AuditLog', timestamps: false })
export class AuditLog
  extends Model<AuditLogAttributes, AuditLogAttributes>
  implements AuditLogAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id?: number;

  @Column({ type: DataType.INTEGER })
  regulationId!: number;

  @Column({ type: DataType.STRING })
  from!: string;

  @Column({ type: DataType.STRING })
  to!: string;

  @Column({ type: DataType.STRING })
  user!: string;

  @Column({ type: DataType.DATE })
  datetime!: Date;

  @Column({ allowNull: true, type: DataType.TINYINT })
  migrated?: number;
}
