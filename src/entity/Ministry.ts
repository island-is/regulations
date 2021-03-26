import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Ministry')
export class Ministry {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  current!: boolean;
  @Column()
  name!: string;
  @Column({ type: 'int', nullable: true })
  order?: number;
  @Column()
  slug!: string;
}
