import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegulationChange')
export class RegulationChange {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  changeset!: string;
  @Column('int')
  changingId!: number;
  @Column('date')
  date!: Date;
  @Column('int')
  regulationId!: number;
  @Column()
  text!: string;
}
