import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { AdminCouponController } from './coupon/controllers/admin-coupon.controller';
import { AdminCouponHistoryController } from './coupon/controllers/admin-coupon-history.controller';
import { AdminCouponService } from './coupon/services/admin-coupon.service';
import { AdminBannerController } from './banner/controllers/admin-banner.controller';
import { AdminBannerService } from './banner/services/admin-banner.service';
import { AdminHomepageSectionController } from './homepage/controllers/admin-homepage-section.controller';
import { AdminHomepageSectionService } from './homepage/services/admin-homepage-section.service';

@Module({
  imports: [FileModule],
  controllers: [
    AdminCouponController,
    AdminCouponHistoryController,
    AdminBannerController,
    AdminHomepageSectionController,
  ],
  providers: [
    AdminCouponService,
    AdminBannerService,
    AdminHomepageSectionService,
  ],
})
export class MarketingModule {}
