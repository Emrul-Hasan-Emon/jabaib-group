import { Module } from '@nestjs/common';
import { AdminPageSettingController } from './controllers/admin-page-setting.controller';
import { AdminPageSettingService } from './services/admin-page-setting.service';
import { AdminShippingZoneController } from './controllers/admin-shipping-zone.controller';
import { AdminShippingZoneService } from './services/admin-shipping-zone.service';
import { AdminSystemSettingController } from './controllers/admin-system-setting.controller';
import { AdminSystemSettingService } from './services/admin-system-setting.service';
import { AdminLanguageController } from './controllers/admin-language.controller';
import { AdminLanguageService } from './services/admin-language.service';
import {
  AdminCountryController,
  AdminDivisionController,
  AdminDistrictController,
} from './controllers/admin-location.controller';
import { AdminCountryService } from './services/admin-country.service';
import { AdminDivisionService } from './services/admin-division.service';
import { AdminDistrictService } from './services/admin-district.service';

@Module({
  controllers: [
    AdminPageSettingController,
    AdminShippingZoneController,
    AdminSystemSettingController,
    AdminLanguageController,
    AdminCountryController,
    AdminDivisionController,
    AdminDistrictController,
  ],
  providers: [
    AdminPageSettingService,
    AdminShippingZoneService,
    AdminSystemSettingService,
    AdminLanguageService,
    AdminCountryService,
    AdminDivisionService,
    AdminDistrictService,
  ],
})
export class SettingsModule {}
