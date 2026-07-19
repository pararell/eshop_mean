import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('configs')
export class Config {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  titleUrl: string;

  @Column({ nullable: true })
  dateAdded: Date;

  @Column({ nullable: true })
  active: boolean;

  @Column({ type: 'simple-json', nullable: true })
  en: {
    shippingCost: {
      basic: { cost: number; limit: number };
      extended: { cost: number; limit: number };
    };
  };

  @Column({ type: 'simple-json', nullable: true })
  sk: {
    shippingCost: {
      basic: { cost: number; limit: number };
      extended: { cost: number; limit: number };
    };
  };

  @Column({ type: 'simple-json', nullable: true })
  cs: {
    shippingCost: {
      basic: { cost: number; limit: number };
      extended: { cost: number; limit: number };
    };
  };
}