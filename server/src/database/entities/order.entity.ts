import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { PaymentStatusHistory } from './payment-status-history.entity';
import { OrderAddress } from './order-address.entity';
import { PaymentGateway } from './payment-gateway.entity';
import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../enums/enums';
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
  listTotal: number; // sum of all item totalPrice (list price, before any SKU discount)

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

  @Column({ type: 'varchar', length: 100 })
  paymentMethod: string; // built-in PaymentMethod value, or a configured PaymentGateway's slug/provider

  /** Configured gateway the order was paid through — null for a built-in method (e.g. plain COD). */
  @Column({ type: 'int', nullable: true })
  @Index()
  paymentGatewayId: number | null;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.DUE })
  @Index()
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

  @OneToMany(() => PaymentStatusHistory, (history) => history.order)
  paymentStatusHistory: PaymentStatusHistory[];

  @OneToOne(() => OrderAddress, (address) => address.order)
  address: OrderAddress;

  @ManyToOne(() => PaymentGateway, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentGatewayId' })
  paymentGateway: PaymentGateway | null;
}
