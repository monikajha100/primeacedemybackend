# Faculty and Batch Management API Documentation

## Faculty Endpoints

### POST /api/faculty
Create a FacultyProfile linked to a user with role=faculty.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "userId": 1,
  "expertise": {
    "software": ["Photoshop", "Illustrator"],
    "specializations": ["Digital Art", "Graphic Design"]
  },
  "availability": {
    "days": ["Monday", "Wednesday", "Friday"],
    "timeSlots": ["10:00-12:00", "14:00-16:00"]
  }
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Faculty profile created successfully",
  "data": {
    "facultyProfile": {
      "id": 1,
      "userId": 1,
      "expertise": {
        "software": ["Photoshop", "Illustrator"],
        "specializations": ["Digital Art", "Graphic Design"]
      },
      "availability": {
        "days": ["Monday", "Wednesday", "Friday"],
        "timeSlots": ["10:00-12:00", "14:00-16:00"]
      },
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "role": "faculty",
        "isActive": true
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId or user doesn't have faculty role
- `404 Not Found` - User not found
- `409 Conflict` - Faculty profile already exists for this user
- `500 Internal Server Error` - Server error

**Notes:**
- The user must already exist and have `role: 'faculty'`
- If the user doesn't have faculty role, update the user role first via user management
- `expertise` and `availability` are optional JSON fields

---

## Batch Endpoints

### POST /api/batches
Create a new batch. Only Admin/SuperAdmin can create batches.

**Authentication:** Required (Bearer token)
**Authorization:** Admin or SuperAdmin role required

**Request Body:**
```json
{
  "title": "Digital Art Fundamentals - Batch 1",
  "software": "Photoshop, Illustrator",
  "mode": "online",
  "startDate": "2024-02-01",
  "endDate": "2024-04-30",
  "maxCapacity": 25,
  "schedule": {
    "days": ["Monday", "Wednesday"],
    "time": "10:00-12:00"
  },
  "status": "active"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Batch created successfully",
  "data": {
    "batch": {
      "id": 1,
      "title": "Digital Art Fundamentals - Batch 1",
      "software": "Photoshop, Illustrator",
      "mode": "online",
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-04-30T00:00:00.000Z",
      "maxCapacity": 25,
      "schedule": {
        "days": ["Monday", "Wednesday"],
        "time": "10:00-12:00"
      },
      "status": "active",
      "createdByAdminId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid data
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized (requires Admin/SuperAdmin)
- `500 Internal Server Error` - Server error

**Field Requirements:**
- `title` (required): Batch title/name
- `mode` (required): "online" or "offline"
- `startDate` (required): ISO date string (YYYY-MM-DD)
- `endDate` (required): ISO date string (YYYY-MM-DD), must be after startDate
- `maxCapacity` (required): Integer >= 1
- `software` (optional): Software/tools string
- `schedule` (optional): JSON object with schedule details
- `status` (optional): Status string

---

### GET /api/batches
List all batches with related faculty and enrolled students.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "title": "Digital Art Fundamentals - Batch 1",
      "software": "Photoshop, Illustrator",
      "mode": "online",
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-04-30T00:00:00.000Z",
      "maxCapacity": 25,
      "currentEnrollment": 15,
      "schedule": {
        "days": ["Monday", "Wednesday"],
        "time": "10:00-12:00"
      },
      "status": "active",
      "createdBy": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@primeacademy.com"
      },
      "faculty": [
        {
          "id": 2,
          "name": "John Doe",
          "email": "john@example.com"
        }
      ],
      "enrolledStudents": [
        {
          "id": 3,
          "name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+1234567890",
          "enrollmentDate": "2024-01-15T00:00:00.000Z",
          "enrollmentStatus": "active"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Response Fields:**
- `id`: Batch ID
- `title`: Batch title
- `software`: Software/tools
- `mode`: "online" or "offline"
- `startDate`: Batch start date
- `endDate`: Batch end date
- `maxCapacity`: Maximum students allowed
- `currentEnrollment`: Number of enrolled students
- `schedule`: Schedule JSON object
- `status`: Batch status
- `createdBy`: Admin who created the batch (id, name, email)
- `faculty`: Array of faculty members assigned to sessions in this batch
- `enrolledStudents`: Array of enrolled students with enrollment details
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

**Notes:**
- Faculty members are extracted from sessions associated with the batch
- Only active enrollments with student information are included
- Batches are ordered by creation date (newest first)

---

## Example Usage

### Create Faculty Profile
```bash
curl -X POST http://localhost:3000/api/faculty \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "expertise": {
      "software": ["Photoshop", "Illustrator"],
      "experience": "5 years"
    },
    "availability": {
      "days": ["Monday", "Wednesday", "Friday"],
      "timeSlots": ["10:00-12:00"]
    }
  }'
```

### Create Batch
```bash
curl -X POST http://localhost:3000/api/batches \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Digital Art Fundamentals - Batch 1",
    "software": "Photoshop, Illustrator",
    "mode": "online",
    "startDate": "2024-02-01",
    "endDate": "2024-04-30",
    "maxCapacity": 25,
    "schedule": {
      "days": ["Monday", "Wednesday"],
      "time": "10:00-12:00"
    }
  }'
```

### Get All Batches
```bash
curl -X GET http://localhost:3000/api/batches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

