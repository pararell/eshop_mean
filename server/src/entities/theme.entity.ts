import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  titleUrl: string;

  @Column({ nullable: true })
  dateAdded: Date;

  @Column({ nullable: true })
  active: boolean;

  @Column({ type: 'simple-json', nullable: true, default: {} })
  styles: any;
}