import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Country } from './country.entity';
import { Division } from './division.entity';

/** Slug is unique within a division (e.g. "dhaka" under Dhaka division; once per that division). */
@Entity()
@Index(['divisionId', 'slug'], { unique: true })
export class District extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  @Column()
  slug: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'int' })
  @Index()
  countryId: number;

  @Column({ type: 'int' })
  @Index()
  divisionId: number;

  @ManyToOne(() => Country, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @ManyToOne(() => Division, (division) => division.districts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'divisionId' })
  division: Division;
}
