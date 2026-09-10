import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { FileUploadService } from './file-upload.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('uploads')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post()
  @RequirePermissions('admin:all')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    this.fileUploadService.validateFile(file);

    const targetFolder = (folder ?? 'misc').replace(/[^a-z0-9-_]/gi, '');
    if (!targetFolder) {
      throw new BadRequestException({
        message: 'Invalid upload folder',
        errorCode: 'INVALID_UPLOAD_FOLDER',
      });
    }

    if (
      targetFolder === 'banners' &&
      !IMAGE_MIME_TYPES.includes(file.mimetype)
    ) {
      throw new BadRequestException({
        message: 'Banner uploads must be JPEG, PNG, or WebP images',
        errorCode: 'FILE_TYPE_NOT_ALLOWED',
      });
    }

    return this.fileUploadService.uploadToCloudinary(file, {
      folder: `${this.fileUploadService.getRootFolder()}/${targetFolder}`,
      publicId: randomUUID(),
    });
  }
}
