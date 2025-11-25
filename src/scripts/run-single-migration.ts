import sequelize from '../config/database';
import { QueryInterface } from 'sequelize';
import * as updateEmployeePunches from '../migrations/20240101000018-update-employee-punches';

const main = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    const queryInterface: QueryInterface = sequelize.getQueryInterface();

    // Run the migration
    console.log('Running migration: update-employee-punches...');
    await updateEmployeePunches.default.up(queryInterface);

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();




