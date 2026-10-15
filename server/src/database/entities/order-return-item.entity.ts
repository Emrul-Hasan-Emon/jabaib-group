import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderReturn } from './order-return.entity';
import { OrderItem } from './order-item.entity';

@Entity()
export class OrderReturnItem extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  orderReturnId: number;

  @Column({ type: 'int' })
  orderItemId: number;

  @Column()
  quantity: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @ManyToOne(() => OrderReturn, (orderReturn) => orderReturn.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderReturnId' })
  orderReturn: OrderReturn;

  @ManyToOne(() => OrderItem)
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;
}
