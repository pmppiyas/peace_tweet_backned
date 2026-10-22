import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import httpStatus from 'http-status-codes';
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
 * Upload a single image file exclusively to Cloudinary using upload_stream.
 */
const uploadImage = async (
  file: Express.Multer.File | undefined,
  folder = 'peacetweet/uploads',
): Promise<IUploadResult> => {
  // 1. Ensure Cloudinary credentials are configured
  if (!isConfigured) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET.',
    );
  }

  // 2. Validate file existence and buffer
  if (!file || !file.buffer) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No image file provided for upload');
  }

  // 3. Validate image MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.`,
    );
  }

  // 4. Stream upload to Cloudinary
  return new Promise<IUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          return reject(
            new AppError(
              httpStatus.BAD_REQUEST,
              `Cloudinary upload failed: ${error.message || 'Unknown error'}`,
            ),
          );
        }
        if (!result) {
          return reject(
            new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Cloudinary returned an empty response'),
          );
        }

        resolve({
          url: result.secure_url,
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
