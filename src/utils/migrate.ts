import sequelize from '../config/database';
import { QueryInterface } from 'sequelize';
import * as createUsers from '../migrations/20240101000001-create-users';
import * as createStudentProfiles from '../migrations/20240101000002-create-student-profiles';
import * as createFacultyProfiles from '../migrations/20240101000003-create-faculty-profiles';
import * as createBatches from '../migrations/20240101000004-create-batches';
import * as createEnrollments from '../migrations/20240101000005-create-enrollments';
import * as createSessions from '../migrations/20240101000006-create-sessions';
import * as createAttendances from '../migrations/20240101000007-create-attendances';
import * as createPaymentTransactions from '../migrations/20240101000008-create-payment-transactions';
import * as createPortfolios from '../migrations/20240101000009-create-portfolios';
import * as createChangeRequests from '../migrations/20240101000010-create-change-requests';
import * as createEmployeePunches from '../migrations/20240101000011-create-employee-punches';
import * as createEmployeeProfiles from '../migrations/20240101000012-create-employee-profiles';
import * as fixForeignKeyConstraints from '../migrations/20240101000016-fix-foreign-key-constraints';
import * as updateEmployeePunches from '../migrations/20240101000018-update-employee-punches';
import * as createBatchFacultyAssignments from '../migrations/20240101000019-create-batch-faculty-assignments';

const migrations = [
  createUsers,
  createStudentProfiles,
  createFacultyProfiles,
  createBatches,
  createEnrollments,
  createSessions,
  createAttendances,
  createPaymentTransactions,
  createPortfolios,
  createChangeRequests,
  createEmployeePunches,
  createEmployeeProfiles,
  fixForeignKeyConstraints,
  updateEmployeePunches,
  createBatchFacultyAssignments,
];

export const runMigrations = async (): Promise<void> => {
  const queryInterface: QueryInterface = sequelize.getQueryInterface();

  try {
    for (const migration of migrations) {
      await migration.default.up(queryInterface);
    }
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

export const undoMigrations = async (): Promise<void> => {
  const queryInterface: QueryInterface = sequelize.getQueryInterface();

  try {
    for (const migration of [...migrations].reverse()) {
      await migration.default.down(queryInterface);
    }
    console.log('All migrations undone successfully.');
  } catch (error) {
    console.error('Migration undo failed:', error);
    throw error;
  }
};

