import {
  Model,
  Table,
  Column,
  DataType,
  Index,
  Sequelize,
  ForeignKey,
} from 'sequelize-typescript';

type LawChapterAttributes = {
  id: number;
  slug: string;
  title: string;
  parentId?: number;
};

@Table({ tableName: 'LawChapter', timestamps: false })
export class LawChapter
  extends Model<LawChapterAttributes, LawChapterAttributes>
  implements LawChapterAttributes {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING(8) })
  slug!: string;

  @Column({ type: DataType.STRING(256) })
  title!: string;

  @Column({ allowNull: true, type: DataType.INTEGER })
  parentId?: number;
}