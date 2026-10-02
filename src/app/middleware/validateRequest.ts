import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

export const validateRequest =
  (zodSchema: ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body && req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }
      if (req.file) {
        req.body.photo = req.file.path;
      }

      req.body = await zodSchema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
