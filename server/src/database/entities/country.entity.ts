import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Division } from './division.entity';

/** Only Bangladesh for now, but modeled so more countries can be added. */
@Entity()
export class Country extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  code: string;

  /** Bangladesh: "BDT". */
  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @OneToMany(() => Division, (division) => division.country)
  divisions: Division[];
}
