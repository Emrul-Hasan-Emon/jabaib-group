import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderAddress } from './order-address.entity';
import { DeliveryType, OrderStatus, PaymentMethod, PaymentStatus } from '../enums/enums';
import { decimalTransformer } from './decimal.transformer';

@Entity()
export class Order extends BaseEntity {
  @Column({ unique: true })
  orderNumber: string;

  @Column({ type: 'int' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  @Index()
  status: string;

  @Column({ type: 'varchar', length: 20, default: DeliveryType.INSIDE_DHAKA })
  @Index()
  deliveryType: string;

  @Column({ type: 'int', nullable: true })
  couponId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  subtotal: number; // sum of all item totalDiscountedPrice before discount, delivery charge, and coupon discount

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  deliveryCharge: number;

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
  total: number; // subtotal + deliveryCharge - discountAmount

  @Column({ type: 'varchar', length: 20 })
  paymentMethod: string; // PaymentMethod enum values: 'cod' or 'online'

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  paymentStatus: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory: OrderStatusHistory[];

  @OneToOne(() => OrderAddress, (address) => address.order)
  address: OrderAddress;
}
