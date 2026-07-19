import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  titleUrl: string;

  @Column({ nullable: true })
  dateAdded: Date;

  @Column({ type: 'simple-json', nullable: true })
  en: { title: string; contentHTML: string };

  @Column({ type: 'simple-json', nullable: true })
  sk: { title: string; contentHTML: string };

  @Column({ type: 'simple-json', nullable: true })
  cs: { title: string; contentHTML: string };
}