import { Module } from '@nestjs/common';
import { AdminReviewController } from './review/controllers/admin-review.controller';
import { AdminReviewService } from './review/services/admin-review.service';
import { AdminWishlistController } from './wishlist/controllers/admin-wishlist.controller';
import { AdminWishlistService } from './wishlist/services/admin-wishlist.service';

@Module({
  controllers: [AdminReviewController, AdminWishlistController],
  providers: [AdminReviewService, AdminWishlistService],
})
export class ModerationModule {}
