import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { dataSource } from '../data-source';
import { Country } from '../entities/country.entity';
import { Division } from '../entities/division.entity';
import { District } from '../entities/district.entity';
import { ShippingZone } from '../entities/shipping-zone.entity';
import { Language } from '../entities/language.entity';
import { AdminUser } from '../entities/admin-user.entity';
import { DeliveryType } from '../enums/enums';
import { AdminUserRoleEnum } from '../enums/user-type.enum';

const DIVISIONS: Array<{ name: string; nameBN: string; districts: Array<{ name: string; nameBN: string }> }> = [
  { name: 'Dhaka', nameBN: 'ঢাকা', districts: [{ name: 'Dhaka', nameBN: 'ঢাকা' }, { name: 'Gazipur', nameBN: 'গাজীপুর' }, { name: 'Narayanganj', nameBN: 'নারায়ণগঞ্জ' }] },
  { name: 'Chattogram', nameBN: 'চট্টগ্রাম', districts: [{ name: 'Chattogram', nameBN: 'চট্টগ্রাম' }, { name: 'Cox\'s Bazar', nameBN: 'কক্সবাজার' }] },
  { name: 'Rajshahi', nameBN: 'রাজশাহী', districts: [{ name: 'Rajshahi', nameBN: 'রাজশাহী' }] },
  { name: 'Khulna', nameBN: 'খুলনা', districts: [{ name: 'Khulna', nameBN: 'খুলনা' }] },
  { name: 'Barisal', nameBN: 'বরিশাল', districts: [{ name: 'Barisal', nameBN: 'বরিশাল' }] },
  { name: 'Sylhet', nameBN: 'সিলেট', districts: [{ name: 'Sylhet', nameBN: 'সিলেট' }] },
  { name: 'Rangpur', nameBN: 'রংপুর', districts: [{ name: 'Rangpur', nameBN: 'রংপুর' }] },
  { name: 'Mymensingh', nameBN: 'ময়মনসিংহ', districts: [{ name: 'Mymensingh', nameBN: 'ময়মনসিংহ' }] },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seed() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.startTransaction();
  try {
    // Country
    let country = await qr.manager.findOne(Country, { where: { slug: 'bangladesh' } });
    if (!country) {
      country = await qr.manager.save(Country, {
        name: 'Bangladesh',
        nameBN: 'বাংলাদেশ',
        slug: 'bangladesh',
        code: 'BD',
        currency: 'BDT',
        isActive: true,
      });
    }

    // Divisions & Districts
    for (const divisionSeed of DIVISIONS) {
      let division = await qr.manager.findOne(Division, {
        where: { countryId: country.id, slug: slugify(divisionSeed.name) },
      });
      if (!division) {
        division = await qr.manager.save(Division, {
          name: divisionSeed.name,
          nameBN: divisionSeed.nameBN,
          slug: slugify(divisionSeed.name),
          countryId: country.id,
          isActive: true,
        });
      }
      for (const districtSeed of divisionSeed.districts) {
        const exists = await qr.manager.findOne(District, {
          where: { divisionId: division.id, slug: slugify(districtSeed.name) },
        });
        if (!exists) {
          await qr.manager.save(District, {
            name: districtSeed.name,
            nameBN: districtSeed.nameBN,
            slug: slugify(districtSeed.name),
            countryId: country.id,
            divisionId: division.id,
            isActive: true,
          });
        }
      }
    }

    // Shipping zones
    const zones = [
      { name: 'Inside Dhaka', nameBN: 'ঢাকার ভিতরে', code: DeliveryType.INSIDE_DHAKA, charge: 60, estimatedDays: 2 },
      { name: 'Outside Dhaka', nameBN: 'ঢাকার বাইরে', code: DeliveryType.OUTSIDE_DHAKA, charge: 120, estimatedDays: 5 },
    ];
    for (const zone of zones) {
      const exists = await qr.manager.findOne(ShippingZone, { where: { code: zone.code } });
      if (!exists) await qr.manager.save(ShippingZone, { ...zone, isActive: true });
    }

    // Languages
    const languages = [
      { name: 'English', code: 'en', isDefault: true },
      { name: 'বাংলা', code: 'bn', isDefault: false },
    ];
    for (const lang of languages) {
      const exists = await qr.manager.findOne(Language, { where: { code: lang.code } });
      if (!exists) await qr.manager.save(Language, { ...lang, isActive: true });
    }

    // Super admin
    const email = process.env.ADMIN_EMAIL ?? 'admin@jabaib.com';
    const existing = await qr.manager.findOne(AdminUser, { where: { email } });
    if (!existing) {
      const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
      await qr.manager.save(AdminUser, {
        name: 'Super Admin',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: AdminUserRoleEnum.SUPER_ADMIN,
        isActive: true,
      });
      console.log(`Seeded super admin: ${email}`);
    }

    await qr.commitTransaction();
    console.log('Seed completed.');
  } catch (error) {
    await qr.rollbackTransaction();
    throw error;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
