import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

interface PunchInBody {
  photo?: string;
  fingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface PunchOutBody {
  photo?: string;
  fingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface AddBreakBody {
  breakType: string;
  startTime: string;
  endTime?: string;
  reason: string;
}

// Punch In
export const punchIn = async (req: AuthRequest & { body: PunchInBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only employees can punch in
    if (req.user.role !== UserRole.EMPLOYEE) {
      res.status(403).json({
        status: 'error',
        message: 'Only employees can punch in',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Format date as YYYY-MM-DD for DATEONLY field
    const todayString = today.toISOString().split('T')[0];

    // Check if already punched in today
    const existingPunch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (existingPunch && existingPunch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You have already punched in today',
      });
      return;
    }

    const { photo, fingerprint, location } = req.body;

    if (existingPunch) {
      // Update existing record
      await existingPunch.update({
        punchInAt: new Date(),
        punchInPhoto: photo || null,
        punchInFingerprint: fingerprint || null,
        punchInLocation: location || null,
      });
    } else {
      // Create new record
      await db.EmployeePunch.create({
        userId: req.user.userId,
        date: todayString,
        punchInAt: new Date(),
        punchInPhoto: photo || null,
        punchInFingerprint: fingerprint || null,
        punchInLocation: location || null,
        breaks: [],
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Punched in successfully',
      data: {
        punchInAt: new Date(),
        location,
      },
    });
  } catch (error) {
    logger.error('Punch in error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error('Punch in error details:', { errorMessage, errorStack });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while punching in',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// Punch Out
export const punchOut = async (req: AuthRequest & { body: PunchOutBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only employees can punch out
    if (req.user.role !== UserRole.EMPLOYEE) {
      res.status(403).json({
        status: 'error',
        message: 'Only employees can punch out',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Find today's punch record
    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (!punch || !punch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You must punch in first',
      });
      return;
    }

    if (punch.punchOutAt) {
      res.status(400).json({
        status: 'error',
        message: 'You have already punched out today',
      });
      return;
    }

    const { photo, fingerprint, location } = req.body;
    const punchOutTime = new Date();

    // Calculate effective working hours
    const punchInTime = new Date(punch.punchInAt);
    const totalMinutes = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60);
    
    // Subtract break time - handle breaks array properly
    let breaks: any[] = [];
    if (punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaks = punch.breaks;
      } else if (typeof punch.breaks === 'string') {
        try {
          const parsed = JSON.parse(punch.breaks);
          breaks = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          logger.warn('Failed to parse breaks as JSON in punchOut, using empty array');
          breaks = [];
        }
      } else {
        breaks = [punch.breaks];
      }
    }
    
    let breakMinutes = 0;
    breaks.forEach((breakItem: any) => {
      if (breakItem && breakItem.startTime && breakItem.endTime) {
        try {
          const breakStart = new Date(breakItem.startTime);
          const breakEnd = new Date(breakItem.endTime);
          if (!isNaN(breakStart.getTime()) && !isNaN(breakEnd.getTime())) {
            breakMinutes += (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
          }
        } catch (e) {
          logger.warn('Error calculating break time:', e);
        }
      }
    });

    const effectiveMinutes = totalMinutes - breakMinutes;
    const effectiveHours = effectiveMinutes / 60;

    try {
      // Update punch out - use set and save for better JSON handling
      punch.set({
        punchOutAt: punchOutTime,
        punchOutPhoto: photo || null,
        punchOutFingerprint: fingerprint || null,
        punchOutLocation: location || null,
        effectiveWorkingHours: parseFloat(effectiveHours.toFixed(2)),
      });
      await punch.save();

      res.status(200).json({
        status: 'success',
        message: 'Punched out successfully',
        data: {
          punchOutAt: punchOutTime,
          effectiveWorkingHours: parseFloat(effectiveHours.toFixed(2)),
          location,
        },
      });
    } catch (updateError) {
      logger.error('Error updating punch out in database:', updateError);
      throw updateError;
    }
  } catch (error) {
    logger.error('Punch out error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error('Punch out error details:', {
      errorMessage,
      errorStack,
      userId: req.user?.userId,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while punching out',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// Get today's punch status
export const getTodayPunch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    // Ensure breaks is always an array and each break has an ID
    let breaksArray: any[] = [];
    if (punch && punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaksArray = punch.breaks.map((b: any, index: number) => ({
          ...b,
          id: b.id || b._id || `break-${index}-${Date.now()}`,
        }));
      } else if (typeof punch.breaks === 'string') {
        try {
          const parsed = JSON.parse(punch.breaks);
          const parsedArray = Array.isArray(parsed) ? parsed : [parsed];
          breaksArray = parsedArray.map((b: any, index: number) => ({
            ...b,
            id: b.id || b._id || `break-${index}-${Date.now()}`,
          }));
        } catch (e) {
          breaksArray = [];
        }
      } else {
        breaksArray = [{
          ...punch.breaks,
          id: punch.breaks.id || punch.breaks._id || `break-0-${Date.now()}`,
        }];
      }
    }
    
    const punchData = punch ? {
      ...punch.toJSON(),
      breaks: breaksArray,
    } : null;

    res.status(200).json({
      status: 'success',
      data: {
        punch: punchData,
        canPunchIn: !punch || !punch.punchInAt,
        canPunchOut: punch && punch.punchInAt && !punch.punchOutAt,
      },
    });
  } catch (error) {
    logger.error('Get today punch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching punch status',
    });
  }
};

// Get daily log
export const getDailyLog = async (
  req: AuthRequest & { query: { from?: string; to?: string; userId?: string } },
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

    const { from, to, userId } = req.query;

    // Employees can only see their own logs, admins can see all
    const targetUserId = userId && (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN)
      ? parseInt(userId, 10)
      : req.user.userId;

    const whereClause: any = { userId: targetUserId };

    if (from || to) {
      whereClause.date = {};
      if (from) {
        whereClause.date[Op.gte] = new Date(from);
      }
      if (to) {
        whereClause.date[Op.lte] = new Date(to);
      }
    }

    const punches = await db.EmployeePunch.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['date', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        punches: punches.map((punch: any) => ({
          id: punch.id,
          date: punch.date,
          punchInAt: punch.punchInAt,
          punchOutAt: punch.punchOutAt,
          punchInPhoto: punch.punchInPhoto,
          punchOutPhoto: punch.punchOutPhoto,
          punchInLocation: punch.punchInLocation,
          punchOutLocation: punch.punchOutLocation,
          breaks: Array.isArray(punch.breaks) ? punch.breaks : (punch.breaks ? [punch.breaks] : []),
          effectiveWorkingHours: punch.effectiveWorkingHours,
          user: punch.user,
        })),
        total: punches.length,
      },
    });
  } catch (error) {
    logger.error('Get daily log error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching daily log',
    });
  }
};

// Add break
export const addBreak = async (
  req: AuthRequest & { body: AddBreakBody },
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

    if (req.user.role !== UserRole.EMPLOYEE) {
      res.status(403).json({
        status: 'error',
        message: 'Only employees can add breaks',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (!punch || !punch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You must punch in first',
      });
      return;
    }

    if (punch.punchOutAt) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot add breaks after punching out',
      });
      return;
    }

    const { breakType, startTime, endTime, reason } = req.body;

    if (!breakType || !reason) {
      res.status(400).json({
        status: 'error',
        message: 'Break type and reason are required',
      });
      return;
    }

    // Use current time if startTime is not provided
    const breakStartTime = startTime || new Date().toISOString();

    // Ensure breaks is always an array
    let breaks: any[] = [];
    if (punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaks = [...punch.breaks];
      } else if (typeof punch.breaks === 'string') {
        try {
          const parsed = JSON.parse(punch.breaks);
          breaks = Array.isArray(parsed) ? [...parsed] : [parsed];
        } catch (e) {
          logger.warn('Failed to parse breaks as JSON, using empty array');
          breaks = [];
        }
      } else {
        breaks = [punch.breaks];
      }
    }
    
    const newBreak = {
      id: `break-${Date.now()}`,
      breakType,
      startTime: breakStartTime,
      endTime: endTime || null,
      reason,
      createdAt: new Date().toISOString(),
    };

    breaks.push(newBreak);
    
    logger.info('Adding break:', { 
      userId: req.user.userId, 
      date: todayString,
      newBreak,
      breaksCount: breaks.length 
    });

    try {
      // Update the breaks field - use set method to ensure proper JSON handling
      punch.set('breaks', breaks);
      await punch.save({ fields: ['breaks'] });
      
      // Reload the punch to get the updated breaks
      await punch.reload();
      
      // Verify the break was saved
      const updatedBreaks = Array.isArray(punch.breaks) ? punch.breaks : (punch.breaks ? [punch.breaks] : []);
      const savedBreak = updatedBreaks.find((b: any) => b.id === newBreak.id);
      
      if (!savedBreak) {
        logger.error('Break was not saved properly', {
          newBreakId: newBreak.id,
          updatedBreaks: updatedBreaks.map((b: any) => b.id),
        });
        throw new Error('Break was not saved to database');
      }

      res.status(200).json({
        status: 'success',
        message: 'Break added successfully',
        data: {
          break: newBreak,
          breaks: updatedBreaks,
        },
      });
    } catch (updateError) {
      logger.error('Error updating breaks in database:', updateError);
      throw updateError;
    }
  } catch (error) {
    logger.error('Add break error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error('Add break error details:', { 
      errorMessage, 
      errorStack,
      breakData: {
        breakType: req.body.breakType,
        startTime: req.body.startTime,
        reason: req.body.reason,
      },
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while adding break',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// End break
export const endBreak = async (
  req: AuthRequest & { params: { breakId: string } },
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

    if (req.user.role !== UserRole.EMPLOYEE) {
      res.status(403).json({
        status: 'error',
        message: 'Only employees can end breaks',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (!punch || !punch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You must punch in first',
      });
      return;
    }

    // Ensure breaks is always an array - handle different formats
    let breaks: any[] = [];
    if (punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaks = [...punch.breaks];
      } else if (typeof punch.breaks === 'string') {
        try {
          const parsed = JSON.parse(punch.breaks);
          breaks = Array.isArray(parsed) ? [...parsed] : [parsed];
        } catch (e) {
          logger.warn('Failed to parse breaks as JSON in endBreak, using empty array');
          breaks = [];
        }
      } else {
        breaks = [punch.breaks];
      }
    }
    
    logger.info('Ending break:', {
      userId: req.user.userId,
      date: todayString,
      breakId: req.params.breakId,
      breaksCount: breaks.length,
      breakIds: breaks.map((b: any) => ({ id: b.id, type: typeof b.id })),
    });
    
    // Try to find break by ID (handle both string and number comparisons)
    const breakId = req.params.breakId;
    const breakIndex = breaks.findIndex((b: any) => {
      // Compare as strings to handle type mismatches
      return String(b.id) === String(breakId) || b.id === breakId;
    });

    if (breakIndex === -1) {
      // Log for debugging
      logger.error('Break not found:', {
        breakId: req.params.breakId,
        breaks: breaks.map((b: any) => ({ id: b.id, type: typeof b.id })),
        punchId: punch.id,
      });
      res.status(404).json({
        status: 'error',
        message: 'Break not found',
        debug: process.env.NODE_ENV === 'development' ? {
          requestedId: req.params.breakId,
          availableIds: breaks.map((b: any) => b.id),
        } : undefined,
      });
      return;
    }

    if (breaks[breakIndex].endTime) {
      res.status(400).json({
        status: 'error',
        message: 'Break already ended',
      });
      return;
    }

    breaks[breakIndex].endTime = new Date().toISOString();
    
    try {
      // Update the breaks field - use set method to ensure proper JSON handling
      punch.set('breaks', breaks);
      await punch.save({ fields: ['breaks'] });
      
      // Reload the punch to get the updated breaks
      await punch.reload();

      // Verify the break was updated
      const updatedBreaks = Array.isArray(punch.breaks) ? punch.breaks : (punch.breaks ? [punch.breaks] : []);
      const updatedBreak = updatedBreaks.find((b: any) => {
        return String(b.id) === String(breakId) || b.id === breakId;
      });
      
      if (!updatedBreak || !updatedBreak.endTime) {
        logger.error('Break end time was not saved properly', {
          breakId: req.params.breakId,
          updatedBreaks: updatedBreaks.map((b: any) => ({ id: b.id, endTime: b.endTime })),
        });
        throw new Error('Break end time was not saved to database');
      }

      res.status(200).json({
        status: 'success',
        message: 'Break ended successfully',
        data: {
          break: updatedBreak,
          breaks: updatedBreaks,
        },
      });
    } catch (updateError) {
      logger.error('Error updating break end time in database:', updateError);
      throw updateError;
    }
  } catch (error) {
    logger.error('End break error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error('End break error details:', {
      errorMessage,
      errorStack,
      breakId: req.params.breakId,
      userId: req.user?.userId,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while ending break',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// Get all employees attendance (Admin/SuperAdmin only)
export const getAllEmployeesAttendance = async (
  req: AuthRequest & { query: { from?: string; to?: string; userId?: string } },
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

    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can view all employees attendance',
      });
      return;
    }

    const { from, to, userId } = req.query;

    const whereClause: any = {};
    if (userId) {
      whereClause.userId = parseInt(userId, 10);
    }
    if (from || to) {
      whereClause.date = {};
      if (from) {
        whereClause.date[Op.gte] = new Date(from);
      }
      if (to) {
        whereClause.date[Op.lte] = new Date(to);
      }
    }

    const punches = await db.EmployeePunch.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
          include: [
            {
              model: db.EmployeeProfile,
              as: 'employeeProfile',
              required: false,
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        punches: punches.map((punch: any) => ({
          id: punch.id,
          date: punch.date,
          user: punch.user,
          punchInAt: punch.punchInAt,
          punchOutAt: punch.punchOutAt,
          punchInPhoto: punch.punchInPhoto,
          punchOutPhoto: punch.punchOutPhoto,
          punchInLocation: punch.punchInLocation,
          punchOutLocation: punch.punchOutLocation,
          breaks: Array.isArray(punch.breaks) ? punch.breaks : (punch.breaks ? [punch.breaks] : []),
          effectiveWorkingHours: punch.effectiveWorkingHours,
        })),
        total: punches.length,
      },
    });
  } catch (error) {
    logger.error('Get all employees attendance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching attendance',
    });
  }
};

