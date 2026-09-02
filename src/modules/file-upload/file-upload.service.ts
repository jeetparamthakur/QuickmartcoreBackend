import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UploadedFileInfo {
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  url: string;
}

@Injectable()
export class FileUploadService {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir =
      this.config.get<string>('uploadDir') ??
      join(process.cwd(), 'uploads');
  }

  validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        message: 'No file provided',
        errorCode: 'FILE_REQUIRED',
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'File exceeds maximum size of 5MB',
        errorCode: 'FILE_TOO_LARGE',
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({
        message: 'File type not allowed',
        errorCode: 'FILE_TYPE_NOT_ALLOWED',
      });
    }
  }

  async saveLocal(file: Express.Multer.File): Promise<UploadedFileInfo> {
    this.validateFile(file);

    await mkdir(this.uploadDir, { recursive: true });

    const ext = extname(file.originalname) || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const storagePath = join(this.uploadDir, filename);

    await writeFile(storagePath, file.buffer);

    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath,
      url: `/uploads/${filename}`,
    };
  }
}
