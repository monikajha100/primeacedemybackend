import { runSeeders } from '../utils/seed';
import sequelize from '../config/database';

const main = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    // Run seeders
    await runSeeders();

    console.log('\n✓ All seeders completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();

