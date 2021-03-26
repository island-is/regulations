import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Task')
export class RegulationTasks {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('int')
  regulationId!: number;
  @Column()
  done!: boolean;
  @Column({ type: 'datetime' })
  lastEdited!: Date;
}
