import { ISODate } from 'db/types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Regulation')
export class Regulation {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('date')
  effectiveDate!: ISODate;
  @Column()
  effectiveDateUnconfirmed!: boolean;
  @Column()
  name!: string;
  @Column('date')
  publishedDate!: ISODate;
  @Column()
  publishedDateUnconfirmed!: boolean;
  @Column({ type: 'date', nullable: true })
  repealedDate?: ISODate;
  @Column('date')
  signatureDate!: ISODate;
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
