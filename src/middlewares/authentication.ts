import { Request } from 'express';
import { getTokenFromRequest, verifyToken } from './auth.middleware';
import { User } from '../entities/busapp/User.entity';
import { Role, Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { AuthUser } from '../interfaces/authUser.interface';

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<AuthUser> {
  if (securityName === 'jwt') {
    const token = getTokenFromRequest(request);
    if (!token) {
      throw AppError.unauthorized('Authentication session cookie required');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      throw AppError.unauthorized('Invalid or expired session cookie');
    }

    const user = await User.findOne({ where: { id: decoded.id }, relations: ['college'] });
    if (!user || user.status !== Status.ACTIVE) {
      throw AppError.unauthorized('User not found or account inactive');
    }

    if (scopes && scopes.length > 0) {
      if (!scopes.includes(user.role) && user.role !== Role.ADMIN) {
        throw AppError.forbidden(`Requires one of [${scopes.join(', ')}] roles`);
      }
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      collegeId: user.collegeId || undefined,
      collegeName: user.college?.name || undefined,
      college: user.college
        ? {
            id: user.college.id,
            name: user.college.name,
            code: user.college.code || undefined,
          }
        : undefined,
      phoneNumber: user.phoneNumber || undefined,
      status: user.status,
    };

    request.user = authUser;
    return authUser;
  }

  throw AppError.unauthorized('Invalid security scheme');
}
