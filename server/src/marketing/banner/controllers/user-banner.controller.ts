import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserBannerService } from '../services/user-banner.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Marketing — User')
@Public()
@Controller({ path: 'user/banner', version: '1' })
export class UserBannerController {
  constructor(private readonly service: UserBannerService) {}

  @Get()
  @ApiOperation({ summary: 'Active banners (optional ?position=hero)' })
  list(@Query('position') position?: string) {
    return this.service.list(position);
  }
}
