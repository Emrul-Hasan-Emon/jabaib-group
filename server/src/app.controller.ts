import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get()
  @ApiTags('Health')
  getHello(): string {
    return this.appService.getHello();
  }
}
