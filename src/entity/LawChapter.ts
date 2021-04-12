import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('LawChapter')
export class DB_LawChapter {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  slug!: string;
  @Column()
  title!: string;
  @Column({ type: 'int', nullable: true })
  parentId?: number;
}
