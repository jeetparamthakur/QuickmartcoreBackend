import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
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

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function inferMimeType(file: Express.Multer.File): string | null {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return file.mimetype;
  const ext = extname(file.originalname || '').toLowerCase();
  return EXT_MIME[ext] ?? null;
}

export interface UploadedFileInfo {
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  url: string;
  publicId?: string;
}

export interface CloudinaryUploadOptions {
  folder: string;
  publicId: string;
}

@Injectable()
export class FileUploadService implements OnModuleInit {
  private readonly uploadDir: string;
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly rootFolder: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir =
      this.config.get<string>('uploadDir') ?? join(process.cwd(), 'uploads');
    this.cloudName = this.config.get<string>('cloudinary.cloudName') ?? '';
    this.apiKey = this.config.get<string>('cloudinary.apiKey') ?? '';
    this.apiSecret = this.config.get<string>('cloudinary.apiSecret') ?? '';
    this.rootFolder =
      this.config.get<string>('cloudinary.folder') ?? 'quickmart';
  }

  onModuleInit() {
    if (!this.isCloudinaryConfigured()) return;
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  isCloudinaryConfigured() {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  getRootFolder() {
    return this.rootFolder;
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
      const inferred = inferMimeType(file);
      if (!inferred || !ALLOWED_MIME_TYPES.includes(inferred)) {
        throw new BadRequestException({
          message: 'File type not allowed',
          errorCode: 'FILE_TYPE_NOT_ALLOWED',
        });
      }
      file.mimetype = inferred;
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

  async uploadToCloudinary(
    file: Express.Multer.File,
    options: CloudinaryUploadOptions,
  ): Promise<UploadedFileInfo> {
    this.validateFile(file);
    if (!this.isCloudinaryConfigured()) {
      throw new ServiceUnavailableException({
        message:
          'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
        errorCode: 'CLOUDINARY_NOT_CONFIGURED',
      });
    }

    const result = await this.uploadBuffer(file, options);

    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: result.public_id,
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  private uploadBuffer(
    file: Express.Multer.File,
    options: CloudinaryUploadOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.publicId,
          resource_type: 'auto',
          overwrite: true,
          invalidate: true,
          unique_filename: false,
          use_filename: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new ServiceUnavailableException({
                    message: 'Cloudinary upload failed',
                    errorCode: 'CLOUDINARY_UPLOAD_FAILED',
                  }),
            );
            return;
          }
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });
  }
}
