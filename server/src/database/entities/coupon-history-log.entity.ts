import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Coupon } from './coupon.entity';
import { User } from './user.entity';
import { Order } from './order.entity';
import { decimalTransformer } from './decimal.transformer';

/** Every time a coupon is applied — one row per order where it was used. */
@Entity()
export class CouponHistoryLog extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  couponId: number;

  @Column({ type: 'int' })
  @Index()
  userId: number;

  @Column({ type: 'int', nullable: true })
  @Index()
  orderId: number;

  /** Snapshot of the code at time of use, even if the coupon is later renamed. */
  @Column({ type: 'varchar', length: 50 })
  couponCode: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discountAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  orderTotal: number;

  @ManyToOne(() => Coupon, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order | null;
}
