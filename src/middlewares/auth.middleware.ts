import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../types/enums';
import { AppError } from '../utils/appError.util';

export interface JwtUserPayload {
  id: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-busapp-key-2026';
export const COOKIE_NAME = 'access_token';

export const generateToken = (payload: JwtUserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtUserPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
  } catch (err) {
    return null;
  }
};

export const getTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  const rawCookieHeader = req.headers.cookie;
  if (rawCookieHeader) {
    const cookies = rawCookieHeader.split(';').reduce((acc: Record<string, string>, cookieStr) => {
      const [key, val] = cookieStr.trim().split('=');
      if (key && val) acc[key] = decodeURIComponent(val);
      return acc;
    }, {});
    if (cookies[COOKIE_NAME]) {
      return cookies[COOKIE_NAME];
    }
  }

  return null;
};

export const requireRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated', data: null });
    }

    if (!roles.includes(req.user.role) && req.user.role !== Role.ADMIN) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] roles`,
        data: null,
      });
    }

    next();
  };
};

export const enforceTenantIsolation = (targetCollegeId?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated', data: null });
    }

    if (req.user.role === Role.ADMIN) {
      return next();
    }

    const collegeId = targetCollegeId || req.params.collegeId || req.body?.collegeId || req.query?.collegeId;
    if (collegeId && req.user.collegeId && collegeId !== req.user.collegeId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access data outside your authorized college scope',
        data: null,
      });
    }

    next();
  };
};

export const getTenantScopeFromReq = (req: Request): string | undefined => {
  if (!req.user) return undefined;
  if (req.user.role === Role.ADMIN) return undefined;
  return req.user.collegeId || undefined;
};

export const resolveTenantCollegeId = (req: Request, targetCollegeId?: string): string | undefined => {
  if (!req.user) {
    throw AppError.unauthorized('Unauthenticated');
  }

  if (req.user.role === Role.ADMIN) {
    return targetCollegeId || undefined;
  }

  const userCollegeId = req.user.collegeId;
  if (!userCollegeId) {
    throw AppError.forbidden('User account is not associated with any college scope');
  }

  if (targetCollegeId && targetCollegeId !== userCollegeId) {
    throw AppError.forbidden('Cannot access or mutate data outside your authorized college scope');
  }

  return userCollegeId;
};
