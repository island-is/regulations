import { ISODate } from '../routes/types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegulationCancel')
export class DB_RegulationCancel {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('int')
  changingId!: number;
  @Column('date')
  date!: ISODate;
  @Column('int')
  regulationId!: number;
}
