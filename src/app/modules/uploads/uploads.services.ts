import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import httpStatus from 'http-status-codes';
import * as fs from 'fs';
import * as path from 'path';
import { envVar } from '../../config/env';
import AppError from '../../utils/appError';
import { IUploadResult } from './uploads.interface';

// Validate and initialize Cloudinary configuration
const isConfigured = Boolean(
  envVar.CLOUDINARY_CLOUD_NAME && envVar.CLOUDINARY_API_KEY && envVar.CLOUDINARY_API_SECRET,
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: envVar.CLOUDINARY_CLOUD_NAME,
    api_key: envVar.CLOUDINARY_API_KEY,
    api_secret: envVar.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Fallback to local disk storage in case Cloudinary fails or is not configured.
 */
const saveFileLocally = (file: Express.Multer.File): IUploadResult => {
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeFilename = `${Date.now()}-${(file.originalname || 'upload.png').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const destination = path.join(uploadDir, safeFilename);
  fs.writeFileSync(destination, file.buffer);

  return {
    url: `/uploads/${safeFilename}`,
    publicId: safeFilename,
    format: path.extname(safeFilename).replace('.', ''),
    bytes: file.size || file.buffer.length,
  };
};

/**
 * Upload a single image file to Cloudinary with graceful local disk fallback.
 */
const uploadImage = async (
  file: Express.Multer.File | undefined,
  folder = 'peacetweet/uploads',
): Promise<IUploadResult> => {
  // 1. Validate file existence and buffer
  if (!file || !file.buffer) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No image file provided for upload');
  }

  // 2. Validate image MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.`,
    );
  }

  // 3. If Cloudinary is configured, attempt upload
  if (isConfigured) {
    try {
      return await new Promise<IUploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error || !result) {
              return reject(error || new Error('Empty Cloudinary response'));
            }

            resolve({
              url: result.secure_url || result.url,
              publicId: result.public_id,
              format: result.format,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
            });
          },
        );

        uploadStream.end(file.buffer);
      });
    } catch (err: any) {
      // Cloudinary failed (e.g. 403 / network) - gracefully fall back to local disk storage
      console.warn(`[Cloudinary Warning] ${err?.message || err}. Falling back to local disk storage.`);
      return saveFileLocally(file);
    }
  }

  // 4. Local fallback if Cloudinary not configured
  return saveFileLocally(file);
};

/**
 * Upload multiple images concurrently to Cloudinary.
 */
const uploadMultipleImages = async (
  files: Express.Multer.File[] | undefined,
  folder = 'peacetweet/uploads',
): Promise<IUploadResult[]> => {
  if (!files || files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No image files provided for upload');
  }

  return Promise.all(files.map((file) => uploadImage(file, folder)));
};

/**
 * Delete an image from Cloudinary by its publicId.
 */
const deleteImage = async (publicId: string): Promise<void> => {
  if (!isConfigured) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cloudinary is not configured.',
    );
  }

  if (!publicId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Public ID is required to delete image');
  }

  await cloudinary.uploader.destroy(publicId);
};

export const uploadsServices = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
};
