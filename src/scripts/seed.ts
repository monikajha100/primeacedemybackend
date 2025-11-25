import sequelize from '../config/database';
import db from '../models';
import bcrypt from 'bcrypt';
import { UserRole } from '../models/User';

const seedUsers = async (): Promise<void> => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    const saltRounds = 10;
    const defaultPassword = 'password123'; // Change this in production!
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Create SuperAdmin
    const [, superAdminCreated] = await db.User.findOrCreate({
      where: { email: 'superadmin@primeacademy.com' },
      defaults: {
        name: 'Super Admin',
        email: 'superadmin@primeacademy.com',
        phone: '+1234567890',
        role: UserRole.SUPERADMIN,
        passwordHash,
        isActive: true,
      },
    });
    console.log(
      superAdminCreated
        ? '✓ SuperAdmin created'
        : '✓ SuperAdmin already exists'
    );

    // Create Admin
    const [, adminCreated] = await db.User.findOrCreate({
      where: { email: 'admin@primeacademy.com' },
      defaults: {
        name: 'Admin User',
        email: 'admin@primeacademy.com',
        phone: '+1234567891',
        role: UserRole.ADMIN,
        passwordHash,
        isActive: true,
      },
    });
    console.log(adminCreated ? '✓ Admin created' : '✓ Admin already exists');

    // Create Faculty
    const [, facultyCreated] = await db.User.findOrCreate({
      where: { email: 'faculty@primeacademy.com' },
      defaults: {
        name: 'Faculty User',
        email: 'faculty@primeacademy.com',
        phone: '+1234567892',
        role: UserRole.FACULTY,
        passwordHash,
        isActive: true,
      },
    });
    console.log(
      facultyCreated ? '✓ Faculty created' : '✓ Faculty already exists'
    );

    // Create Student
    const [, studentCreated] = await db.User.findOrCreate({
      where: { email: 'student@primeacademy.com' },
      defaults: {
        name: 'Student User',
        email: 'student@primeacademy.com',
        phone: '+1234567893',
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
      },
    });
    console.log(
      studentCreated ? '✓ Student created' : '✓ Student already exists'
    );

    console.log('\n=== Default Login Credentials ===');
    console.log('All users have the password: password123\n');
    console.log('SuperAdmin:');
    console.log('  Email: superadmin@primeacademy.com');
    console.log('  Password: password123\n');
    console.log('Admin:');
    console.log('  Email: admin@primeacademy.com');
    console.log('  Password: password123\n');
    console.log('Faculty:');
    console.log('  Email: faculty@primeacademy.com');
    console.log('  Password: password123\n');
    console.log('Student:');
    console.log('  Email: student@primeacademy.com');
    console.log('  Password: password123\n');
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedUsers;

