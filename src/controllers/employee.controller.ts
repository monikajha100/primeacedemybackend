import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreateEmployeeProfileBody {
  userId: number;
  employeeId: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  nationality?: string;
  maritalStatus?: 'Single' | 'Married' | 'Other';
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';
  reportingManager?: string;
  workLocation?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  panNumber?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface GetEmployeeProfileParams {
  id: string;
}

export const createEmployeeProfile = async (
  req: AuthRequest & { body: CreateEmployeeProfileBody },
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

    const {
      userId,
      employeeId,
      gender,
      dateOfBirth,
      nationality,
      maritalStatus,
      department,
      designation,
      dateOfJoining,
      employmentType,
      reportingManager,
      workLocation,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      panNumber,
      city,
      state,
      postalCode,
    } = req.body;

    // Validation
    if (!userId || !employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'userId and employeeId are required',
      });
      return;
    }

    // Verify user exists and has employee role
    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if (user.role !== UserRole.EMPLOYEE) {
      res.status(400).json({
        status: 'error',
        message: 'User must have an employee role to create an employee profile',
      });
      return;
    }

    // Check if employee profile already exists
    const existingProfile = await db.EmployeeProfile.findOne({ where: { userId } });
    if (existingProfile) {
      res.status(409).json({
        status: 'error',
        message: 'Employee profile already exists for this user',
      });
      return;
    }

    // Check if employeeId is already taken
    const existingEmployeeId = await db.EmployeeProfile.findOne({ where: { employeeId } });
    if (existingEmployeeId) {
      res.status(409).json({
        status: 'error',
        message: 'Employee ID already exists',
      });
      return;
    }

    // Create employee profile
    const employeeProfile = await db.EmployeeProfile.create({
      userId,
      employeeId,
      gender: gender || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      nationality: nationality || null,
      maritalStatus: maritalStatus || null,
      department: department || null,
      designation: designation || null,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
      employmentType: employmentType || null,
      reportingManager: reportingManager || null,
      workLocation: workLocation || null,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      branch: branch || null,
      panNumber: panNumber || null,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
    });

    res.status(201).json({
      status: 'success',
      message: 'Employee profile created successfully',
      data: {
        employeeProfile: {
          id: employeeProfile.id,
          userId: employeeProfile.userId,
          employeeId: employeeProfile.employeeId,
          gender: employeeProfile.gender,
          dateOfBirth: employeeProfile.dateOfBirth,
          nationality: employeeProfile.nationality,
          maritalStatus: employeeProfile.maritalStatus,
          department: employeeProfile.department,
          designation: employeeProfile.designation,
          dateOfJoining: employeeProfile.dateOfJoining,
          employmentType: employeeProfile.employmentType,
          reportingManager: employeeProfile.reportingManager,
          workLocation: employeeProfile.workLocation,
          bankName: employeeProfile.bankName,
          accountNumber: employeeProfile.accountNumber,
          ifscCode: employeeProfile.ifscCode,
          branch: employeeProfile.branch,
          panNumber: employeeProfile.panNumber,
          city: employeeProfile.city,
          state: employeeProfile.state,
          postalCode: employeeProfile.postalCode,
          createdAt: employeeProfile.createdAt,
          updatedAt: employeeProfile.updatedAt,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Create employee profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating employee profile',
    });
  }
};

export const getEmployeeProfile = async (
  req: AuthRequest & { params: GetEmployeeProfileParams },
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

    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Employees can only view their own profile, unless they are admin/superadmin
    if (req.user.userId !== userId && req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own employee profile unless you are an admin',
      });
      return;
    }

    const employeeProfile = await db.EmployeeProfile.findOne({
      where: { userId },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role'],
        },
      ],
    });

    if (!employeeProfile) {
      res.status(404).json({
        status: 'error',
        message: 'Employee profile not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        employeeProfile: {
          id: employeeProfile.id,
          userId: employeeProfile.userId,
          employeeId: employeeProfile.employeeId,
          gender: employeeProfile.gender,
          dateOfBirth: employeeProfile.dateOfBirth,
          nationality: employeeProfile.nationality,
          maritalStatus: employeeProfile.maritalStatus,
          department: employeeProfile.department,
          designation: employeeProfile.designation,
          dateOfJoining: employeeProfile.dateOfJoining,
          employmentType: employeeProfile.employmentType,
          reportingManager: employeeProfile.reportingManager,
          workLocation: employeeProfile.workLocation,
          bankName: employeeProfile.bankName,
          accountNumber: employeeProfile.accountNumber,
          ifscCode: employeeProfile.ifscCode,
          branch: employeeProfile.branch,
          panNumber: employeeProfile.panNumber,
          city: employeeProfile.city,
          state: employeeProfile.state,
          postalCode: employeeProfile.postalCode,
          createdAt: employeeProfile.createdAt,
          updatedAt: employeeProfile.updatedAt,
          user: (employeeProfile as any).user,
        },
      },
    });
  } catch (error) {
    logger.error('Get employee profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching employee profile',
    });
  }
};




