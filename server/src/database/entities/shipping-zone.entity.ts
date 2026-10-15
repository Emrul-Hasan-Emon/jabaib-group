import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DeliveryType } from '../enums/enums';
import { decimalTransformer } from './decimal.transformer';

/** Simple shipping: Inside Dhaka and Outside Dhaka. */
@Entity()
export class ShippingZone extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  @Column({ type: 'varchar', unique: true })
  code: DeliveryType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  charge: number;

  @Column({ type: 'int', nullable: true })
  estimatedDays: number;

  @Column({ default: true })
  isActive: boolean;
}
