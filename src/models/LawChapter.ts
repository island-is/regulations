import { LawChapterSlug } from 'routes/types';
import { Model, Table, Column, DataType } from 'sequelize-typescript';

type LawChapterAttributes = {
  id: number;
  slug: LawChapterSlug;
  title: string;
  parentId?: number;
};

@Table({ tableName: 'LawChapter', timestamps: false })
export class DB_LawChapter
  extends Model<LawChapterAttributes, LawChapterAttributes>
  implements LawChapterAttributes
{
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING(8) })
  slug!: LawChapterSlug;

  @Column({ type: DataType.STRING(256) })
  title!: string;

  @Column({ allowNull: true, type: DataType.INTEGER })
  parentId?: number;
}
