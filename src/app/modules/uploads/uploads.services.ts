import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import httpStatus from 'http-status-codes';
import * as path from 'path';
import { envVar } from '../../config/env';
import AppError from '../../utils/appError';
import { IUploadResult } from './uploads.interface';

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

const uploadImage = async (
  file: Express.Multer.File | undefined,
  folder = 'peacetweet/uploads',
): Promise<IUploadResult> => {
  if (!file || !file.buffer) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No image file provided for upload');
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.`,
    );
  }

  if (isConfigured) {
    return new Promise<IUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(
              new AppError(httpStatus.BAD_REQUEST, `Cloudinary upload failed: ${error.message}`),
            );
          }
          if (!result) {
            return reject(
              new AppError(httpStatus.BAD_REQUEST, 'Cloudinary upload returned empty response'),
            );
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

  try {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const destination = path.join(uploadDir, safeFilename);
    fs.writeFileSync(destination, file.buffer);

    return {
      url: `/uploads/${safeFilename}`,
      publicId: safeFilename,
    };
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to process image upload');
  }
};

export const uploadsServices = {
  uploadImage,
};
