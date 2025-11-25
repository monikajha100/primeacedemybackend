import { undoMigrations } from '../utils/migrate';
import sequelize from '../config/database';

const main = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    // Undo migrations
    await undoMigrations();

    console.log('\n✓ Migrations undone successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Undo migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();

