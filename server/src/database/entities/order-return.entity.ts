import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { User } from './user.entity';
import { OrderReturnItem } from './order-return-item.entity';
import { OrderReturnStatusHistory } from './order-return-status-history.entity';
import { OrderReturnStatus } from '../enums/enums';
import { decimalTransformer } from './decimal.transformer';

@Entity()
export class OrderReturn extends BaseEntity {
  @Column({ unique: true })
  returnNumber: string;

  @Column({ type: 'int' })
  @Index()
  orderId: number;

  @Column({ type: 'int' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 20, default: OrderReturnStatus.REQUESTED })
  @Index()
  status: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  refundAmount: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  refundMethod: string;

  @Column({ type: 'jsonb', nullable: true })
  media: string[];

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderReturnItem, (item) => item.orderReturn)
  items: OrderReturnItem[];

  @OneToMany(() => OrderReturnStatusHistory, (h) => h.orderReturn)
  statusHistory: OrderReturnStatusHistory[];
}
