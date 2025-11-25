import sequelize from '../config/database';
import { QueryInterface } from 'sequelize';
import * as seedUsers from '../seeders/20240101000001-seed-users';
import * as seedDemoData from '../seeders/20240101000002-seed-demo-data';

const seeders = [
  seedUsers,
  seedDemoData,
];

export const runSeeders = async (): Promise<void> => {
  const queryInterface: QueryInterface = sequelize.getQueryInterface();

  try {
    for (const seeder of seeders) {
      await seeder.default.up(queryInterface);
    }
    console.log('All seeders completed successfully.');
  } catch (error) {
    console.error('Seeder failed:', error);
    throw error;
  }
};

export const undoSeeders = async (): Promise<void> => {
  const queryInterface: QueryInterface = sequelize.getQueryInterface();

  try {
    for (const seeder of [...seeders].reverse()) {
      await seeder.default.down(queryInterface);
    }
    console.log('All seeders undone successfully.');
  } catch (error) {
    console.error('Seeder undo failed:', error);
    throw error;
  }
};

