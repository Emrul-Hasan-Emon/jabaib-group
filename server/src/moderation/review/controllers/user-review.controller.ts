import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';
import { CreateUserReviewDto } from '../dtos/create-user-review.dto';
import { UserReviewService } from '../services/user-review.service';

@ApiTags('Catalog — Reviews (customer)')
@Controller({ path: 'user/review', version: '1' })
export class UserReviewController {
  constructor(private readonly service: UserReviewService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Approved reviews + rating summary for a product' })
  listForProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @PaginationParams() pagination: Pagination,
  ) {
    return this.service.listForProduct(productId, pagination);
  }

  @Get('my')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'My reviews (with moderation status)' })
  my(
    @CurrentUser() user: JwtPayload,
    @PaginationParams() pagination: Pagination,
  ) {
    return this.service.myReviews(user.id, pagination);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit a review (pending moderation)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserReviewDto) {
    return this.service.create(user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete my own review' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(user.id, id);
  }
}
