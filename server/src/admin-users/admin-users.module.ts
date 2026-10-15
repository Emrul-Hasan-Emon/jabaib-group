import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { AdminUserManagementController } from './controllers/admin-user-management.controller';
import { AdminUserManagementService } from './services/admin-user-management.service';

@Module({
  imports: [FileModule],
  controllers: [AdminUserManagementController],
  providers: [AdminUserManagementService],
})
export class AdminUsersModule {}
