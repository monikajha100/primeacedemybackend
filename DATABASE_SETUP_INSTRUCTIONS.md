# Database Setup Instructions

## Option 1: Import SQL File (Recommended)

1. **Create the database:**
   ```sql
   CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Import the SQL file:**
   - Using MySQL Workbench: File → Run SQL Script → Select `database_schema.sql`
   - Using command line:
     ```bash
     mysql -u root -p primeacademy_db < database_schema.sql
     ```

3. **Verify the import:**
   ```sql
   USE primeacademy_db;
   SHOW TABLES;
   SELECT COUNT(*) FROM users;
   ```

4. **Default login credentials (already included in SQL):**
   - **SuperAdmin:** `superadmin@primeacademy.com` / `password123`
   - **Admin:** `admin@primeacademy.com` / `password123`
   - **Faculty:** `faculty@primeacademy.com` / `password123`
   - **Student:** `student@primeacademy.com` / `password123`

## Option 2: Use Migrations

1. **Update `.env` file with your MySQL credentials:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=primeacademy_db
   DB_USER=root
   DB_PASSWORD=your_password
   ```

2. **Create the database:**
   ```sql
   CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Run migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

4. **Seed default users:**
   ```bash
   npm run seed
   ```

## Database Tables Created

The SQL file creates the following tables:

1. `users` - User accounts with authentication
2. `student_profiles` - Student-specific information
3. `faculty_profiles` - Faculty-specific information
4. `batches` - Training batches/courses
5. `enrollments` - Student enrollments in batches
6. `sessions` - Class sessions
7. `attendances` - Attendance records
8. `payment_transactions` - Payment records
9. `portfolios` - Student portfolios
10. `change_requests` - Change request tracking
11. `employee_punches` - Employee time tracking

## Notes

- All tables use UTF8MB4 charset for full Unicode support
- Foreign keys are properly configured with CASCADE, RESTRICT, or SET NULL
- Indexes are created on frequently queried columns
- JSON columns are used for flexible data storage
- Timestamps (createdAt, updatedAt) are automatically managed

## Troubleshooting

### Import Errors
- Make sure MySQL version is 5.7+ (for JSON support)
- Verify charset is utf8mb4
- Check foreign key constraints are supported

### Connection Issues
- Verify MySQL service is running
- Check credentials in `.env` file
- Ensure database exists before importing

### Password Hash Issues
If login fails, the password hashes might need to be regenerated. Run:
```bash
npm run seed
```
This will create/update users with properly hashed passwords.

