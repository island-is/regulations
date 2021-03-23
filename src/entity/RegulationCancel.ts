import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegulationCancel')
export class RegulationCancel {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  changingId!: number;
  @Column()
  date!: Date;
  @Column()
  regulationId!: number;
}
