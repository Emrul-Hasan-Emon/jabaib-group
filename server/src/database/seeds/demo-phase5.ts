import 'dotenv/config';
import { dataSource } from '../data-source';
import { Coupon } from '../entities/coupon.entity';
import { Banner } from '../entities/banner.entity';
import { HomepageSection } from '../entities/homepage-section.entity';
import { PageSettings } from '../entities/page-settings.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { CouponType } from '../enums/enums';

/**
 * Phase 5 demo content — marketing & settings.
 * Idempotent: keyed on unique code/key columns, safe to re-run.
 */
async function demoPhase5() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.startTransaction();
  try {
    // Coupons
    const coupons: Array<Record<string, unknown>> = [
      {
        code: 'WELCOME10',
        type: CouponType.PERCENT,
        amount: 10,
        minOrderAmount: 500,
        maxDiscountAmount: 200,
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: true,
      },
      {
        code: 'FLAT50',
        type: CouponType.FLAT,
        amount: 50,
        minOrderAmount: 1000,
        usageLimit: 500,
        perUserLimit: 1,
        isActive: true,
      },
      {
        code: 'EID25',
        type: CouponType.PERCENT,
        amount: 25,
        minOrderAmount: 2000,
        maxDiscountAmount: 750,
        usageLimit: 200,
        perUserLimit: 1,
        startsAt: new Date('2026-10-01T00:00:00Z'),
        endsAt: new Date('2026-11-15T23:59:59Z'),
        isActive: true,
      },
    ];
    for (const c of coupons) {
      const exists = await qr.manager.findOne(Coupon, {
        where: { code: c.code as string },
      });
      if (!exists) await qr.manager.save(Coupon, c);
    }

    // Banners
    const banners: Array<Record<string, unknown>> = [
      {
        title: 'Eid Collection 2026',
        titleBN: 'ঈদ কালেকশন ২০২৬',
        imageUrl: '/uploads/banners/eid-desktop.jpg',
        mobileImageUrl: '/uploads/banners/eid-mobile.jpg',
        linkUrl: '/collections/sale',
        position: 'hero',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'New Arrivals',
        titleBN: 'নতুন আগমন',
        imageUrl: '/uploads/banners/new-arrivals.jpg',
        mobileImageUrl: '/uploads/banners/new-arrivals-mobile.jpg',
        linkUrl: '/collections/new-arrival',
        position: 'side',
        sortOrder: 2,
        isActive: true,
      },
    ];
    for (const b of banners) {
      const exists = await qr.manager.findOne(Banner, {
        where: { title: b.title as string },
      });
      if (!exists) await qr.manager.save(Banner, b);
    }

    // Homepage sections
    const sections: Array<Record<string, unknown>> = [
      {
        key: 'hero_banners',
        title: 'Hero Banners',
        titleBN: 'প্রধান ব্যানার',
        type: 'banners',
        content: { limit: 3 },
        sortOrder: 1,
        isActive: true,
      },
      {
        key: 'new_arrivals',
        title: 'New Arrivals',
        titleBN: 'নতুন আগমন',
        type: 'products',
        content: { sort: 'newest', limit: 8 },
        sortOrder: 2,
        isActive: true,
      },
      {
        key: 'shop_by_category',
        title: 'Shop by Category',
        titleBN: 'ক্যাটাগরি অনুযায়ী কেনাকাটা',
        type: 'categories',
        content: { sort: 'tree', limit: 12 },
        sortOrder: 3,
        isActive: true,
      },
      {
        key: 'featured_collections',
        title: 'Featured Collections',
        titleBN: 'বিশেষ সংকলন',
        type: 'products',
        content: { collectionIds: [1, 2, 3], sort: 'featured', limit: 8 },
        sortOrder: 4,
        isActive: true,
      },
    ];
    for (const s of sections) {
      const exists = await qr.manager.findOne(HomepageSection, {
        where: { key: s.key as string },
      });
      if (!exists) await qr.manager.save(HomepageSection, s);
    }

    // Static pages
    const pages: Array<Record<string, unknown>> = [
      {
        key: 'about_us',
        title: 'About Us',
        titleBN: 'আমাদের সম্পর্কে',
        content:
          '<h2>Jabaib Clothing</h2><p>Quality fashion for Bangladesh since 2020. From casual T-shirts to premium shirts and dresses, we bring you fabric you can feel.</p>',
        contentBN:
          '<h2>জাবাইব ক্লদিং</h2><p>২০২০ সাল থেকে বাংলাদেশের জন্য মানসম্মত ফ্যাশন। ক্যাজুয়াল টি-শার্ট থেকে প্রিমিয়াম শার্ট ও ড্রেস — আমরা এনে দিই এমন কাপড় যা আপনি অনুভব করতে পারবেন।</p>',
        isActive: true,
      },
      {
        key: 'contact_us',
        title: 'Contact Us',
        titleBN: 'যোগাযোগ',
        content:
          '<p>Phone: 01700-000000</p><p>Email: support@jabaib.com</p><p>Dhaka, Bangladesh</p>',
        contentBN:
          '<p>ফোন: ০১৭০০-০০০০০০</p><p>ইমেইল: support@jabaib.com</p><p>ঢাকা, বাংলাদেশ</p>',
        isActive: true,
      },
      {
        key: 'return_policy',
        title: 'Return Policy',
        titleBN: 'রিটার্ন পলিসি',
        content:
          '<p>Return any unused item within 7 days of delivery in original packaging.</p>',
        contentBN:
          '<p>ডেলিভারির ৭ দিনের মধ্যে অব্যবহৃত পণ্য মূল প্যাকেজিংসহ রিটার্ন করুন।</p>',
        isActive: true,
      },
      {
        key: 'terms_conditions',
        title: 'Terms & Conditions',
        titleBN: 'শর্তাবলী',
        content:
          '<p>By placing an order you agree to our pricing and delivery terms.</p>',
        contentBN:
          '<p>অর্ডার করার মাধ্যমে আপনি আমাদের মূল্য ও ডেলিভারি শর্ত মেনেছেন বলে গণ্য হবে।</p>',
        isActive: true,
      },
    ];
    for (const p of pages) {
      const exists = await qr.manager.findOne(PageSettings, {
        where: { key: p.key as string },
      });
      if (!exists) await qr.manager.save(PageSettings, p);
    }

    // System settings (grouped key-values)
    const settings: Array<Record<string, unknown>> = [
      {
        key: 'site_name',
        value: 'Jabaib',
        description: 'Brand name shown in the storefront',
        group: 'general',
      },
      {
        key: 'site_name_bn',
        value: 'জাবাইব',
        description: 'বাংলা ব্র্যান্ডের নাম',
        group: 'general',
      },
      {
        key: 'support_phone',
        value: '+8801700000000',
        description: 'Customer support hotline',
        group: 'contact',
      },
      {
        key: 'support_email',
        value: 'support@jabaib.com',
        description: 'Customer support email',
        group: 'contact',
      },
      {
        key: 'shop_address',
        value: 'Gulshan, Dhaka, Bangladesh',
        description: 'Store address',
        group: 'contact',
      },
      {
        key: 'facebook_url',
        value: 'https://facebook.com/jabaib',
        description: 'Facebook page link',
        group: 'social',
      },
      {
        key: 'instagram_url',
        value: 'https://instagram.com/jabaib',
        description: 'Instagram profile link',
        group: 'social',
      },
      {
        key: 'youtube_url',
        value: 'https://youtube.com/@jabaib',
        description: 'YouTube channel link',
        group: 'social',
      },
      {
        key: 'free_delivery_threshold',
        value: '2000',
        description: 'Orders above this total get free delivery (BDT)',
        group: 'shipping',
      },
      {
        key: 'cod_available',
        value: 'true',
        description: 'Whether Cash on Delivery is enabled',
        group: 'payment',
      },
    ];
    for (const s of settings) {
      const exists = await qr.manager.findOne(SystemSetting, {
        where: { key: s.key as string },
      });
      if (!exists) await qr.manager.save(SystemSetting, s);
    }

    await qr.commitTransaction();
    const couponCount = await qr.manager.count(Coupon);
    const bannerCount = await qr.manager.count(Banner);
    console.log(
      `Phase 5 demo complete. Coupons: ${couponCount}, Banners: ${bannerCount}, Sections: ${await qr.manager.count(HomepageSection)}, Pages: ${await qr.manager.count(PageSettings)}, Settings: ${await qr.manager.count(SystemSetting)}`,
    );
  } catch (error) {
    await qr.rollbackTransaction();
    throw error;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

demoPhase5().catch((error) => {
  console.error(error);
  process.exit(1);
});
