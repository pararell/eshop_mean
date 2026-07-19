import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id: string;

  @Column({ nullable: true })
  googleId?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  salt?: string;

  @Column({ type: 'simple-json', nullable: true, default: { items: [] } })
  cart?: { items: any[] };

  @Column({ type: 'simple-json', nullable: true, default: [] })
  images?: string[];

  @Column({ type: 'simple-json', nullable: true, default: [] })
  roles?: string[];
}