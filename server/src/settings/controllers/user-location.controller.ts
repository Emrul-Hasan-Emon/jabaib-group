import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserLocationService } from '../services/user-location.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Locations — User')
@Public()
@Controller({ path: 'user/location', version: '1' })
export class UserLocationController {
  constructor(private readonly service: UserLocationService) {}

  @Get('tree')
  @ApiOperation({
    summary: 'Active countries → divisions → districts (address pickers)',
  })
  tree() {
    return this.service.tree();
  }

  @Get('division')
  @ApiOperation({ summary: 'Active divisions (optional ?countryId=)' })
  divisions(@Query('countryId') countryId?: string) {
    return this.service.divisions(countryId ? Number(countryId) : undefined);
  }

  @Get('district')
  @ApiOperation({ summary: 'Active districts (optional ?divisionId=)' })
  districts(@Query('divisionId') divisionId?: string) {
    return this.service.districts(divisionId ? Number(divisionId) : undefined);
  }
}
