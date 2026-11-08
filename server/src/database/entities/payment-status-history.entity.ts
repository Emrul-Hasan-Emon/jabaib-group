import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';

@Entity()
export class PaymentStatusHistory extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  orderId: number;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  /** Who changed it — use createdBy/creatorType from BaseEntity (admin id, user id, or 'gateway'). */
  @ManyToOne(() => Order, (order) => order.paymentStatusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
