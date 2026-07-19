import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  cardId: string;

  @Column({ nullable: true })
  amount: number;

  @Column({ nullable: true })
  amount_refunded: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ type: 'simple-json', nullable: true })
  cart: any;

  @Column({ type: 'simple-json', nullable: true })
  outcome: { seller_message: string };

  @Column({ type: 'simple-json', nullable: true, default: [] })
  addresses: any[];

  @Column({ nullable: true })
  dateAdded: Date;

  @Column({ nullable: true })
  _user: string;
}