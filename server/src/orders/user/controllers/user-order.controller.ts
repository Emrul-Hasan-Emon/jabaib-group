import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';
import { FileHandleService } from '../../../file/services/file-handle.service';
import { uploadFolder } from '../../../file/upload-folders';
import {
  CheckoutDto,
  CancelOrderDto,
  RequestReturnDto,
} from '../dtos/user-order.dto';
import { UserCheckoutService } from '../services/user-checkout.service';
import { UserOrderService } from '../services/user-order.service';

/** Customer orders: history, detail, cancel, returns, and placing an order. */
@ApiTags('Orders (customer)')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'user/order', version: '1' })
export class UserOrderController {
  constructor(
    private readonly service: UserOrderService,
    private readonly checkout: UserCheckoutService,
    private readonly files: FileHandleService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'My orders (paginated, newest first)' })
  list(
    @CurrentUser() user: JwtPayload,
    @PaginationParams() pagination: Pagination,
  ) {
    return this.service.list(user.id, pagination);
  }

  @Post()
  @ApiOperation({
    summary:
      'Place an order — writes order, items, address, payment, coupon usage and status history atomically',
  })
  place(@CurrentUser() user: JwtPayload, @Body() dto: CheckoutDto) {
    return this.checkout.place(user, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Order detail with items, timeline, payments and returns',
  })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel my order (only while it is pending)' })
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.service.cancel(user, id, dto);
  }

  @Post('return/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Upload a return photo — returns { url, path } to attach to a return request',
  })
  async uploadReturnImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.files.uploadFile(file, uploadFolder('orderReturn'));
  }

  @Post(':id/return')
  @ApiOperation({
    summary: 'Request a return on a delivered order (inside the return window)',
  })
  requestReturn(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestReturnDto,
  ) {
    return this.service.requestReturn(user, id, dto);
  }
}
