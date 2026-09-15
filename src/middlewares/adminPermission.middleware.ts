import { Role } from '../constants/appConstant';
import { AdminPermission } from '../entities/admin/Admin.entity';
import express from 'express';

const verifyAdminPermissions = (permission: AdminPermission) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (!req.user || req.user.role !== Role.ADMIN) {
      return res.status(403).json({
        message: 'Permission not Allowed',
        data: null,
      });
    }

    const adminUser = req.user as any;
    if (adminUser?.permissions && !adminUser.permissions.includes(permission)) {
      return res.status(403).json({
        message: `${permission} is not allowed to this admin, contact platform admin for permission`,
        data: null,
      });
    }
    return next();
  };
};

export default verifyAdminPermissions;
