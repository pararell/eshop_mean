import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { languages } from '../shared/constans';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  titleUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  mainImage: { url: string; name: string };

  @Column({ type: 'simple-json', nullable: true, default: [] })
  images: string[];

  @Column({ type: 'simple-json', nullable: true, default: [] })
  tags: string[];

  @Column({ nullable: true })
  _user: string;

  @Column({ nullable: true })
  dateAdded: Date;

  // Language-specific fields stored as JSON
  @Column({ type: 'simple-json', nullable: true })
  en: {
    title: string;
    description: string;
    descriptionFull: any[];
    regularPrice: number;
    salePrice: number;
    onSale: boolean;
    stock: string;
    visibility: boolean;
    shipping: string;
  };

  @Column({ type: 'simple-json', nullable: true })
  sk: {
    title: string;
    description: string;
    descriptionFull: any[];
    regularPrice: number;
    salePrice: number;
    onSale: boolean;
    stock: string;
    visibility: boolean;
    shipping: string;
  };

  @Column({ type: 'simple-json', nullable: true })
  cs: {
    title: string;
    description: string;
    descriptionFull: any[];
    regularPrice: number;
    salePrice: number;
    onSale: boolean;
    stock: string;
    visibility: boolean;
    shipping: string;
  };
}