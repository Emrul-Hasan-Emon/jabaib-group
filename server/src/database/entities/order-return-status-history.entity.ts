import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderReturn } from './order-return.entity';
import { OrderReturnStatus } from '../enums/enums';

@Entity()
export class OrderReturnStatusHistory extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  orderReturnId: number;

  @Column({ type: 'varchar', length: 20 })
  status: OrderReturnStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @ManyToOne(() => OrderReturn, (orderReturn) => orderReturn.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderReturnId' })
  orderReturn: OrderReturn;
}
