import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegulationChange')
export class RegulationChange {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  changeset!: string;
  @Column()
  changingId!: number;
  @Column()
  date!: Date;
  @Column()
  regulationId!: number;
  @Column()
  text!: string;
}
