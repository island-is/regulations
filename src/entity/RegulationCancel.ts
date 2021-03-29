import { ISODate } from 'db/types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegulationCancel')
export class RegulationCancel {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('int')
  changingId!: number;
  @Column('date')
  date!: ISODate;
  @Column('int')
  regulationId!: number;
}
