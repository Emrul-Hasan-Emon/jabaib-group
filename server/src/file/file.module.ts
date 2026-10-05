import { Module } from '@nestjs/common';
import { FileHandleService } from './file-handle.service';
import { FileController } from './file.controller';

@Module({
  controllers: [FileController],
  providers: [FileHandleService],
  exports: [FileHandleService],
})
export class FileModule {}
