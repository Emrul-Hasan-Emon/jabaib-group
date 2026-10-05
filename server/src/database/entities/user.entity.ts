import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Address } from './address.entity';
import { AuthProvider } from './auth-provider.entity';

@Entity()
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  email: string;

  /** Primary identifier in Bangladesh — keep every user reachable by phone. */
  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  avatarPath: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => AuthProvider, (provider) => provider.user)
  authProviders: AuthProvider[];
}
