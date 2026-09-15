import { plainToClass } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';

export class RequestValidator {
  static validate = (classInstance: any) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const convertedObject = plainToClass(classInstance, req.body);

      const errors: ValidationError[] = await validate(convertedObject, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const rawErrors: string[] = [];

        for (const errorItem of errors) {
          // nested errors
          if (errorItem.children && errorItem.children.length > 0) {
            for (const child of errorItem.children) {
              rawErrors.push(...Object.values(child.constraints ?? {}));
            }
          }
          // non-nested
          rawErrors.push(...Object.values(errorItem.constraints ?? {}));
        }

        return res.status(400).json({ errors: rawErrors }); // send response and stop
      }

      // replace request body with validated object (optional)
      req.body = convertedObject;

      next(); // call next middleware/controller
    };
  };
}



export function createValidatorMiddleware(schema: any) {
  class ValidatorMiddleware {
    public use(req: Request, res: Response, next: NextFunction) {
      return RequestValidator.validate(schema)(req, res, next);
    }
  }
  return ValidatorMiddleware;
}
