import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Regulation_Ministry')
export class RegulationMinistry {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('int')
  ministryId!: number;
  @Column('int')
  regulationId!: number;
}
