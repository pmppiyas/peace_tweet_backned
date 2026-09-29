import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName =
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey =
      this.configService.get<string>('CLOUDINARY_API_KEY') || process.env.CLOUDINARY_API_KEY;
    const apiSecret =
      this.configService.get<string>('CLOUDINARY_API_SECRET') || process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary successfully configured for media uploads');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Cloudinary credentials not provided. Falling back to local disk storage for uploads.',
      );
    }
  }

  // Upload image buffer to Cloudinary or fallback to local disk
  async uploadImage(
    file: Express.Multer.File,
    folder = 'peacetweet/uploads',
  ): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided for upload');
    }

    // Validate image mimetype
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.`,
      );
    }

    // Cloudinary upload if configured
    if (this.isConfigured) {
      return new Promise<UploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              return reject(new BadRequestException(`Cloudinary upload failed: ${error.message}`));
            }
            if (!result) {
              return reject(new BadRequestException('Cloudinary upload returned empty response'));
            }
            resolve({
              url: result.secure_url || result.url,
              publicId: result.public_id,
            });
          },
        );

        uploadStream.end(file.buffer);
      });
    }

    // Graceful local file fallback
    try {
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const destination = path.join(uploadDir, safeFilename);
      fs.writeFileSync(destination, file.buffer);

      const localUrl = `/uploads/${safeFilename}`;
      return {
        url: localUrl,
        publicId: safeFilename,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Local upload fallback failed: ${msg}`);
      throw new BadRequestException('Failed to process image upload');
    }
  }
}
