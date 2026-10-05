import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { Division } from './division.entity';
import { District } from './district.entity';

/** Delivery address snapshot for one order — survives any later edits to User/Address. */
@Entity()
export class OrderAddress extends BaseEntity {
  @Column({ type: 'int', unique: true })
  @Index()
  orderId: number;

  @Column()
  recipientName: string;

  @Column()
  phone: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'int', nullable: true })
  divisionId: number;

  @Column({ type: 'int', nullable: true })
  districtId: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string;

  @OneToOne(() => Order, (order) => order.address, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Division, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'divisionId' })
  division: Division | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'districtId' })
  district: District | null;
}
