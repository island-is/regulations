import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Regulation_Ministry')
export class RegulationMinistry {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  ministryId!: number;
  @Column()
  regulationId!: number;
}
