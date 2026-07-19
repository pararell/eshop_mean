import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  titleUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  mainImage: { url: string; name: string; type?: boolean };

  @Column({ type: 'simple-json', nullable: true, default: [] })
  subCategories: string[];

  @Column({ nullable: true })
  _user: string;

  @Column({ nullable: true })
  dateAdded: Date;

  @Column({ type: 'simple-json', nullable: true })
  en: {
    title: string;
    description: string;
    position: number;
    visibility: boolean;
    menuHidden: boolean;
  };

  @Column({ type: 'simple-json', nullable: true })
  sk: {
    title: string;
    description: string;
    position: number;
    visibility: boolean;
    menuHidden: boolean;
  };

  @Column({ type: 'simple-json', nullable: true })
  cs: {
    title: string;
    description: string;
    position: number;
    visibility: boolean;
    menuHidden: boolean;
  };
}