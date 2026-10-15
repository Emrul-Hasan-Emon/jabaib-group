import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { AdminCouponController } from './coupon/controllers/admin-coupon.controller';
import { AdminCouponHistoryController } from './coupon/controllers/admin-coupon-history.controller';
import { AdminCouponService } from './coupon/services/admin-coupon.service';
import { AdminBannerController } from './banner/controllers/admin-banner.controller';
import { AdminBannerService } from './banner/services/admin-banner.service';
import { UserBannerController } from './banner/controllers/user-banner.controller';
import { UserBannerService } from './banner/services/user-banner.service';
import { AdminHomepageSectionController } from './homepage/controllers/admin-homepage-section.controller';
import { AdminHomepageSectionService } from './homepage/services/admin-homepage-section.service';
import { UserHomepageSectionController } from './homepage/controllers/user-homepage-section.controller';
import { UserHomepageSectionService } from './homepage/services/user-homepage-section.service';
import { UserCouponController } from './coupon/controllers/user-coupon.controller';
import { UserCouponService } from './coupon/services/user-coupon.service';

@Module({
  imports: [FileModule],
  controllers: [
    AdminCouponController,
    AdminCouponHistoryController,
    AdminBannerController,
    AdminHomepageSectionController,
    UserBannerController,
    UserHomepageSectionController,
    UserCouponController,
  ],
  providers: [
    AdminCouponService,
    AdminBannerService,
    AdminHomepageSectionService,
    UserBannerService,
    UserHomepageSectionService,
    UserCouponService,
  ],
  // Exported so checkout can validate coupons inside the order transaction.
  exports: [UserCouponService],
})
export class MarketingModule {}
