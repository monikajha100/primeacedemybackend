import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { PaymentStatus } from '../models/PaymentTransaction';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreatePaymentBody {
  studentId: number;
  amount: number;
  dueDate: string;
  status?: PaymentStatus;
  receiptUrl?: string;
  initialPaidAmount?: number;
}

interface GetStudentPaymentsParams {
  id: string;
}

interface GetPaymentsQuery {
  status?: PaymentStatus;
  studentId?: string;
}

interface RecordPaymentParams {
  id: string;
}

interface RecordPaymentBody {
  amountPaid: number;
  receiptUrl?: string;
}

export const createPayment = async (req: AuthRequest & { body: CreatePaymentBody }, res: Response): Promise<void> => {
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
        message: 'Only admins can create payment schedules',
      });
      return;
    }

    const { studentId, amount, dueDate, status, receiptUrl, initialPaidAmount } = req.body;

    // Validation
    if (!studentId || !amount || !dueDate) {
      res.status(400).json({
        status: 'error',
        message: 'studentId, amount, and dueDate are required',
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than 0',
      });
      return;
    }

    // Validate status if provided
    if (status && !Object.values(PaymentStatus).includes(status)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid status. Allowed values: ' + Object.values(PaymentStatus).join(', '),
      });
      return;
    }

    // Validate date format
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid dueDate format. Use YYYY-MM-DD',
      });
      return;
    }

    // Verify student exists and is a student
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Set paidAt if status is 'paid'
    const paymentStatus = status || PaymentStatus.PENDING;
    let paidAmount = 0;

    if (typeof initialPaidAmount === 'number') {
      if (initialPaidAmount < 0 || initialPaidAmount > amount) {
        res.status(400).json({
          status: 'error',
          message: 'initialPaidAmount must be between 0 and total amount',
        });
        return;
      }
      paidAmount = initialPaidAmount;
    } else if (paymentStatus === PaymentStatus.PAID) {
      paidAmount = amount;
    }

    let finalStatus = paymentStatus;
    if (paidAmount > 0 && paidAmount < amount) {
      finalStatus = PaymentStatus.PARTIAL;
    } else if (paidAmount >= amount) {
      finalStatus = PaymentStatus.PAID;
      paidAmount = amount;
    } else if (paidAmount === 0 && paymentStatus === PaymentStatus.PARTIAL) {
      finalStatus = PaymentStatus.PENDING;
    }

    const paidAt = finalStatus === PaymentStatus.PAID ? new Date() : null;

    // Create payment transaction
    const payment = await db.PaymentTransaction.create({
      studentId,
      amount,
      paidAmount,
      dueDate: dueDateObj,
      status: finalStatus,
      receiptUrl: receiptUrl || null,
      paidAt,
    });

    res.status(201).json({
      status: 'success',
      message: 'Payment transaction created successfully',
      data: {
        payment: {
          id: payment.id,
          studentId: payment.studentId,
          amount: payment.amount,
          paidAmount: payment.paidAmount,
          dueDate: payment.dueDate,
          paidAt: payment.paidAt,
          status: payment.status,
          receiptUrl: payment.receiptUrl,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Create payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating payment',
    });
  }
};

export const getStudentPayments = async (
  req: AuthRequest & { params: GetStudentPaymentsParams },
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

    const studentId = parseInt(req.params.id, 10);

    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // Verify student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Check authorization: student can only view their own payments, admins can view any
    if (
      req.user.userId !== studentId &&
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.SUPERADMIN
    ) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own payments unless you are an admin',
      });
      return;
    }

    // Get all payments for the student
    const payments = await db.PaymentTransaction.findAll({
      where: { studentId },
      order: [['dueDate', 'DESC'], ['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
        },
        payments,
        count: payments.length,
      },
    });
  } catch (error) {
    logger.error('Get student payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching payments',
    });
  }
};

export const getAllPayments = async (
  req: AuthRequest & { query: GetPaymentsQuery },
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
        message: 'Only admins can view all payments',
      });
      return;
    }

    const { status, studentId } = req.query;
    const where: any = {};

    if (status) {
      if (!Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid status filter',
        });
        return;
      }
      where.status = status;
    }

    if (studentId) {
      const parsed = parseInt(studentId, 10);
      if (isNaN(parsed)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid student ID filter',
        });
        return;
      }
      where.studentId = parsed;
    }

    const payments = await db.PaymentTransaction.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        payments,
        count: payments.length,
      },
    });
  } catch (error) {
    logger.error('Get all payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching payments',
    });
  }
};

export const recordPayment = async (
  req: AuthRequest & { params: RecordPaymentParams; body: RecordPaymentBody },
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
        message: 'Only admins can record payments',
      });
      return;
    }

    const paymentId = parseInt(req.params.id, 10);
    const { amountPaid, receiptUrl } = req.body;

    if (isNaN(paymentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid payment ID',
      });
      return;
    }

    if (!amountPaid || amountPaid <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'amountPaid must be greater than 0',
      });
      return;
    }

    const payment = await db.PaymentTransaction.findByPk(paymentId);
    if (!payment) {
      res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
      return;
    }

    const totalAmount = parseFloat(payment.amount.toString());
    const currentPaid = parseFloat(payment.paidAmount.toString());
    const remaining = totalAmount - currentPaid;

    if (remaining <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Payment is already fully paid',
      });
      return;
    }

    if (amountPaid > remaining) {
      res.status(400).json({
        status: 'error',
        message: `Amount exceeds remaining balance (₹${remaining.toFixed(2)})`,
      });
      return;
    }

    const newPaidAmount = currentPaid + amountPaid;

    payment.paidAmount = newPaidAmount;
    if (receiptUrl) {
      payment.receiptUrl = receiptUrl;
    }

    if (newPaidAmount >= totalAmount) {
      payment.status = PaymentStatus.PAID;
      payment.paidAmount = totalAmount;
      payment.paidAt = new Date();
    } else {
      payment.status = PaymentStatus.PARTIAL;
      payment.paidAt = null;
    }

    await payment.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment recorded successfully',
      data: {
        payment,
      },
    });
  } catch (error) {
    logger.error('Record payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while recording payment',
    });
  }
};

