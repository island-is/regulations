import { ISODate } from '../routes/types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegulationChange')
export class DB_RegulationChange {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  changeset!: string;
  @Column('int')
  changingId!: number;
  @Column('date')
  date!: ISODate;
  @Column('int')
  regulationId!: number;
  // @Column()
  // title?: string;
  @Column()
  text!: string;
}
