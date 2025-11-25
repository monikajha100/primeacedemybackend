import { runMigrations } from '../utils/migrate';
import sequelize from '../config/database';

const main = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    // Run migrations
    await runMigrations();

    console.log('\n✓ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();

