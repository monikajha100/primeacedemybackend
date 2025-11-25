# MySQL Database Setup

This project uses **MySQL** with Sequelize ORM.

## Database Configuration

The database configuration is in `src/config/database.ts`.

### Environment Variables

Update your `.env` file with your MySQL credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production-make-it-long-and-secure
JWT_EXPIRES_IN=24h
```

## Setup Steps

1. **Create the Database**
   ```sql
   CREATE DATABASE primeacademy_db;
   ```

2. **Update `.env` file** with your MySQL credentials

3. **Run Migrations**
   ```bash
   npm run migrate
   ```
   Or if using Sequelize CLI directly:
   ```bash
   npx sequelize-cli db:migrate
   ```

4. **Seed Default Users**
   ```bash
   npm run seed
   ```

## Default Login Credentials

After running the seed script:

- **SuperAdmin:** `superadmin@primeacademy.com` / `password123`
- **Admin:** `admin@primeacademy.com` / `password123`
- **Faculty:** `faculty@primeacademy.com` / `password123`
- **Student:** `student@primeacademy.com` / `password123`

## MySQL Connection Requirements

- MySQL version 5.7+ or MariaDB 10.3+
- The database must exist before running migrations
- User must have CREATE, ALTER, DROP, INSERT, UPDATE, DELETE, SELECT privileges

## Troubleshooting

### Connection Refused Error
- Make sure MySQL service is running
- Check if the port (3306) is correct
- Verify username and password in `.env`

### Authentication Plugin Error (MySQL 8+)
If you get `caching_sha2_password` errors, you may need to:
```sql
ALTER USER 'your_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Character Set Issues
Make sure your database uses utf8mb4:
```sql
CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

