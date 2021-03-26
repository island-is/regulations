import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Regulation_LawChapter')
export class RegulationLawChapter {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('int')
  regulationId!: number;
  @Column('int')
  chapterId!: number;
}
