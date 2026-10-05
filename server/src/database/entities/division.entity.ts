import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Country } from './country.entity';
import { District } from './district.entity';

/** Slug is unique within a country (e.g. "dhaka" exists once per country). */
@Entity()
@Index(['countryId', 'slug'], { unique: true })
export class Division extends BaseEntity {
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

  @ManyToOne(() => Country, (country) => country.divisions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @OneToMany(() => District, (district) => district.division)
  districts: District[];
}
