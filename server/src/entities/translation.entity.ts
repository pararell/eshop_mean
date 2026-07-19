import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('translations')
export class Translation {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  lang: string;

  @Column({ type: 'simple-json', nullable: true, default: {} })
  keys: any;
}