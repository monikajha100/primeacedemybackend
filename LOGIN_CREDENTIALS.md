# Default Login Credentials

After running the seed script (`npm run seed`), the following users will be created in the database.

**All users have the same password:** `password123`

## Users

### SuperAdmin
- **Email:** `superadmin@primeacademy.com`
- **Password:** `password123`
- **Role:** `superadmin`
- **Permissions:** Full access to all features

### Admin
- **Email:** `admin@primeacademy.com`
- **Password:** `password123`
- **Role:** `admin`
- **Permissions:** Can create batches, manage students, view reports

### Faculty
- **Email:** `faculty@primeacademy.com`
- **Password:** `password123`
- **Role:** `faculty`
- **Permissions:** Can create sessions, mark attendance, manage classes

### Student
- **Email:** `student@primeacademy.com`
- **Password:** `password123`
- **Role:** `student`
- **Permissions:** Can view enrolled batches, sessions, and personal information

---

## How to Create These Users

1. **Make sure PostgreSQL is running** and the database exists
2. **Run migrations** (if not already done):
   ```bash
   npm run migrate
   ```
3. **Run the seed script**:
   ```bash
   npm run seed
   ```

The seed script will create all users if they don't already exist.

---

## Important Security Note

⚠️ **These are default credentials for development/testing only!**

In production, you should:
- Change all default passwords immediately
- Use strong, unique passwords
- Remove or disable the seed script
- Use proper user management and authentication flows

---

## API Endpoints

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@primeacademy.com",
  "password": "password123"
}
```

### Register New User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "student"
}
```

