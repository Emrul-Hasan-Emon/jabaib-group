import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { AddressType } from '../enums/enums';
import { Division } from './division.entity';
import { District } from './district.entity';

@Entity()
export class Address extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 20, default: AddressType.SHIPPING })
  type: string;

  @Column()
  recipientName: string;

  @Column()
  phone: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'int', nullable: true })
  @Index()
  divisionId: number;

  @Column({ type: 'int', nullable: true })
  @Index()
  districtId: number;

  @ManyToOne(() => Division, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'divisionId' })
  division: Division | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'districtId' })
  district: District | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
