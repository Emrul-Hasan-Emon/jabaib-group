import { Module } from '@nestjs/common';
import { FileHandleService } from './services/file-handle.service';

/**
 * Low-level disk storage for uploads. There is NO generic public file API —
 * each feature exposes its own upload/replace/remove endpoints through its
 * admin controller and resolves its folder from `upload-folders.ts`.
 */
@Module({
  providers: [FileHandleService],
  exports: [FileHandleService],
})
export class FileModule {}
