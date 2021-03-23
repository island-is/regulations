import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Regulation')
export class Regulation {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  effectiveDate!: Date;
  @Column()
  effectiveDateUnconfirmed!: boolean;
  @Column()
  name!: string;
  @Column()
  publishedDate!: Date;
  @Column()
  publishedDateUnconfirmed!: boolean;
  @Column({ nullable: true })
  repealedDate?: Date;
  @Column()
  signatureDate!: Date;
  @Column()
  signatureDateUnconfirmed!: boolean;
  @Column()
  status!: 'raw' | 'unsafe' | 'draft' | 'text_locked' | 'migrated';
  @Column()
  text!: string;
  @Column()
  title!: string;
  @Column()
  type!: 'base' | 'amending' | 'repealing';
  @Column({ nullable: true })
  updateComment?: string;
  @Column({ nullable: true })
  updatedEffectiveDateTemp?: string;
  @Column({ nullable: true })
  updatedPublishedDateTemp?: string;
  @Column({ nullable: true })
  updatedSignatureDateTemp?: string;
}
