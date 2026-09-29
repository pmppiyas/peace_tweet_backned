import jwt, { JwtPayload } from 'jsonwebtoken';
import AppError from '../utils/appError';

export const verifyToken = (token: string, secret: string): JwtPayload => {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired token!');
  }
};
