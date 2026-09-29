import jwt, { SignOptions } from 'jsonwebtoken';

export const generateToken = (
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string,
) => {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn,
  } as SignOptions);
};
