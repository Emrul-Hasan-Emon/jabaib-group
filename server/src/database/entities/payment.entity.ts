import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { PaymentMethod, PaymentStatus } from '../enums/enums';
import { decimalTransformer } from './decimal.transformer';

@Entity()
export class Payment extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  orderId: number;

  @Column({ type: 'varchar', length: 20 })
  method: string;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  @Index()
  status: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string;

  /**
   * Gateway-specific details the customer submitted at checkout for a manual
   * payment, e.g. `{ txnId }` for MFS or `{ accountName, accountNumber,
   * bankName, branchName }` for a bank transfer. Kept as a free-form object so
   * a new gateway type can carry its own fields without a schema change.
   */
  @Column({ type: 'jsonb', nullable: true })
  metaData: Record<string, unknown>;

  /** Provider-reported payload for bKash/Nagad/card callbacks. */
  @Column({ type: 'jsonb', nullable: true })
  providerResponse: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
