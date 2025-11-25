import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { Module } from '../models/Permission';
import db from '../models';
import { logger } from '../utils/logger';

interface UpdatePermissionsBody {
  permissions: Array<{
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

// Get permissions for a user
export const getUserPermissions = async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = parseInt(req.params.id, 10);

    // Users can view their own permissions, or admins can view any user's permissions
    if (req.user.userId !== userId && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own permissions',
      });
      return;
    }

    const permissions = await db.Permission.findAll({
      where: { userId },
      order: [['module', 'ASC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        permissions,
      },
    });
  } catch (error) {
    logger.error('Get user permissions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching permissions',
    });
  }
};

// Update permissions for a user
export const updateUserPermissions = async (
  req: AuthRequest & { params: { id: string }; body: UpdatePermissionsBody },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only SuperAdmin and Admin can update permissions
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update permissions',
      });
      return;
    }

    const userId = parseInt(req.params.id, 10);

    // Check if user exists
    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Prevent modifying SuperAdmin permissions
    if (user.role === UserRole.SUPERADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot modify SuperAdmin permissions',
      });
      return;
    }

    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({
        status: 'error',
        message: 'Permissions must be an array',
      });
      return;
    }

    // Validate modules
    const validModules = Object.values(Module);
    for (const perm of permissions) {
      if (!validModules.includes(perm.module)) {
        res.status(400).json({
          status: 'error',
          message: `Invalid module: ${perm.module}. Allowed modules: ${validModules.join(', ')}`,
        });
        return;
      }
    }

    // Update or create permissions
    const updatedPermissions = [];
    for (const perm of permissions) {
      const [permission, created] = await db.Permission.findOrCreate({
        where: {
          userId,
          module: perm.module,
        },
        defaults: {
          userId,
          module: perm.module,
          canView: perm.canView || false,
          canAdd: perm.canAdd || false,
          canEdit: perm.canEdit || false,
          canDelete: perm.canDelete || false,
        },
      });

      if (!created) {
        await permission.update({
          canView: perm.canView || false,
          canAdd: perm.canAdd || false,
          canEdit: perm.canEdit || false,
          canDelete: perm.canDelete || false,
        });
      }

      updatedPermissions.push(permission);
    }

    res.status(200).json({
      status: 'success',
      message: 'Permissions updated successfully',
      data: {
        permissions: updatedPermissions,
      },
    });
  } catch (error) {
    logger.error('Update user permissions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating permissions',
    });
  }
};

// Get all available modules
export const getModules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const modules = Object.values(Module).map((module) => ({
      value: module,
      label: module
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    }));

    res.status(200).json({
      status: 'success',
      data: {
        modules,
      },
    });
  } catch (error) {
    logger.error('Get modules error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching modules',
    });
  }
};

