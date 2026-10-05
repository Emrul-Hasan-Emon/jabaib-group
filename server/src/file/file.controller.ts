import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileHandleService } from './file-handle.service';

/** Allowed upload folders — keep storage tidy per entity. */
const FOLDERS = [
  'attribute',
  'category',
  'product',
  'product-sku',
  'banner',
  'user',
  'order-return',
  'general',
];

@ApiTags('File')
@ApiBearerAuth('JWT-auth')
@Controller('file')
export class FileController {
  constructor(private readonly fileHandle: FileHandleService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single file to a folder' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', enum: FOLDERS, example: 'product' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadOne(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
  ) {
    this.assertFolder(folder);
    if (!file) throw new BadRequestException('file is required');
    return this.fileHandle.uploadFile(file, folder);
  }

  @Post('upload-many')
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiOperation({ summary: 'Upload multiple files to a folder' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', enum: FOLDERS, example: 'product' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  async uploadMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string,
  ) {
    this.assertFolder(folder);
    if (!files?.length) throw new BadRequestException('files are required');
    return this.fileHandle.uploadFiles(files, folder);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a stored file by its path/url' })
  @ApiQuery({ name: 'path', example: 'jabaib/product/photo-1700000000000-ab12cd34ef56.jpg' })
  async remove(@Query('path') path: string) {
    if (!path) throw new BadRequestException('path is required');
    return { removed: this.fileHandle.removeFile(path) };
  }

  private assertFolder(folder: string) {
    if (!folder || !FOLDERS.includes(folder)) {
      throw new BadRequestException(
        `folder must be one of: ${FOLDERS.join(', ')}`,
      );
    }
  }
}
