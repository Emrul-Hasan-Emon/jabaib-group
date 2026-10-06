import { Module } from '@nestjs/common';
import { FileHandleService } from './services/file-handle.service';
import { FileController } from './controllers/file.controller';

@Module({
  controllers: [FileController],
  providers: [FileHandleService],
  exports: [FileHandleService],
})
export class FileModule {}
