import { Module } from '@nestjs/common';
import { AdminReviewController } from './review/controllers/admin-review.controller';
import { AdminReviewService } from './review/services/admin-review.service';
import { UserReviewController } from './review/controllers/user-review.controller';
import { UserReviewService } from './review/services/user-review.service';
import { AdminWishlistController } from './wishlist/controllers/admin-wishlist.controller';
import { AdminWishlistService } from './wishlist/services/admin-wishlist.service';
import { UserWishlistController } from './wishlist/controllers/user-wishlist.controller';
import { UserWishlistService } from './wishlist/services/user-wishlist.service';

@Module({
  controllers: [
    AdminReviewController,
    AdminWishlistController,
    UserReviewController,
    UserWishlistController,
  ],
  providers: [
    AdminReviewService,
    AdminWishlistService,
    UserReviewService,
    UserWishlistService,
  ],
})
export class ModerationModule {}
