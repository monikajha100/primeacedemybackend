# Reporting & Approval API Documentation

## Reporting Endpoints

### GET /api/reports/students-without-batch

Return all students who are not enrolled in any active batch.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "students": [
      {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "createdAt": "2024-01-10T00:00:00.000Z",
        "enrollments": []
      }
    ],
    "totalCount": 1
  }
}
```

**Response Fields:**
- `students`: Array of students without active batch enrollment
- `totalCount`: Total number of students without batch

**Notes:**
- Only returns active students (`isActive=true`)
- Students with no enrollments or only inactive/ended/cancelled batch enrollments are included

---

### GET /api/reports/batch-attendance?batchId=&from=&to=

Return batch attendance statistics including total sessions, total attendance count, and attendance percentage.

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `batchId` (required): Batch ID
- `from` (optional): Start date filter (YYYY-MM-DD)
- `to` (optional): End date filter (YYYY-MM-DD)

**Example Request:**
```
GET /api/reports/batch-attendance?batchId=1&from=2024-02-01&to=2024-02-29
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "batch": {
      "id": 1,
      "title": "Digital Art Fundamentals - Batch 1",
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-04-30T00:00:00.000Z"
    },
    "dateRange": {
      "from": "2024-02-01",
      "to": "2024-02-29"
    },
    "statistics": {
      "totalSessions": 8,
      "totalAttendanceCount": 24,
      "attendancePercentage": "83.33%",
      "presentCount": 20,
      "absentCount": 4
    },
    "sessions": [
      {
        "session": {
          "id": 1,
          "date": "2024-02-01",
          "startTime": "10:00",
          "endTime": "12:00",
          "topic": "Introduction to Digital Art",
          "status": "completed"
        },
        "attendances": [
          {
            "id": 1,
            "studentId": 3,
            "studentName": "Jane Smith",
            "studentEmail": "jane@example.com",
            "status": "present",
            "isManual": false,
            "markedBy": {
              "id": 2,
              "name": "Faculty User"
            },
            "markedAt": "2024-02-01T10:15:00.000Z"
          }
        ]
      }
    ],
    "studentStatistics": [
      {
        "studentId": 3,
        "present": 7,
        "absent": 1,
        "manualPresent": 0,
        "total": 8,
        "attendanceRate": "87.50%"
      }
    ]
  }
}
```

**Response Fields:**
- `batch`: Batch information
- `dateRange`: Applied date filter (if any)
- `statistics`: 
  - `totalSessions`: Total number of sessions in the date range
  - `totalAttendanceCount`: Total number of attendance records
  - `attendancePercentage`: Percentage of present (including manual_present) attendances
  - `presentCount`: Number of present attendances
  - `absentCount`: Number of absent attendances
- `sessions`: Array of sessions with their attendance records
- `studentStatistics`: Per-student attendance statistics

**Error Responses:**
- `400 Bad Request` - Missing batchId or invalid date format
- `404 Not Found` - Batch not found

---

### GET /api/reports/pending-payments

Return all students with status='pending' payments.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "id": 1,
        "student": {
          "id": 3,
          "name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+1234567890"
        },
        "amount": 5000.00,
        "dueDate": "2024-03-01T00:00:00.000Z",
        "status": "pending",
        "isOverdue": false,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "summary": {
      "totalPending": 15,
      "totalPendingAmount": "75000.00",
      "overdue": {
        "count": 3,
        "amount": "15000.00"
      },
      "upcoming": {
        "count": 12,
        "amount": "60000.00"
      }
    }
  }
}
```

**Response Fields:**
- `payments`: Array of pending payment transactions with student information
- `summary`:
  - `totalPending`: Total number of pending payments
  - `totalPendingAmount`: Total amount of pending payments
  - `overdue`: Count and total amount of overdue payments (dueDate < today)
  - `upcoming`: Count and total amount of upcoming payments (dueDate >= today)

**Notes:**
- Payments are ordered by dueDate (earliest first)
- `isOverdue` flag indicates if payment is past due date

---

## Approval Endpoints

### POST /api/approvals

Create a ChangeRequest with entityType, entityId, and reason. Status is automatically set to 'pending'.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "entityType": "batch",
  "entityId": 1,
  "reason": "Request to change batch schedule due to faculty availability"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Change request created successfully",
  "data": {
    "changeRequest": {
      "id": 1,
      "entityType": "batch",
      "entityId": 1,
      "reason": "Request to change batch schedule due to faculty availability",
      "status": "pending",
      "requestedBy": {
        "id": 2,
        "name": "Faculty User",
        "email": "faculty@primeacademy.com"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Field Requirements:**
- `entityType` (required): Type of entity (e.g., 'batch', 'session', 'enrollment', etc.)
- `entityId` (required): ID of the entity (must be positive number)
- `reason` (optional): Reason for the change request

**Notes:**
- Status is automatically set to 'pending'
- `requestedBy` is automatically set to the current authenticated user

---

### POST /api/approvals/:id/respond

SuperAdmin approves or rejects a change request. Updates status and response timestamp.

**Authentication:** Required (Bearer token)
**Authorization:** SuperAdmin role only

**Request Body:**
```json
{
  "approve": true
}
```

**Response (200 OK - Approved):**
```json
{
  "status": "success",
  "message": "Change request approved successfully",
  "data": {
    "changeRequest": {
      "id": 1,
      "entityType": "batch",
      "entityId": 1,
      "reason": "Request to change batch schedule due to faculty availability",
      "status": "approved",
      "requestedBy": {
        "id": 2,
        "name": "Faculty User",
        "email": "faculty@primeacademy.com"
      },
      "approver": {
        "id": 1,
        "name": "Super Admin",
        "email": "superadmin@primeacademy.com"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-20T14:30:00.000Z"
    }
  }
}
```

**Response (200 OK - Rejected):**
```json
{
  "status": "success",
  "message": "Change request rejected successfully",
  "data": {
    "changeRequest": {
      "id": 1,
      "entityType": "batch",
      "entityId": 1,
      "reason": "Request to change batch schedule due to faculty availability",
      "status": "rejected",
      "requestedBy": {
        "id": 2,
        "name": "Faculty User",
        "email": "faculty@primeacademy.com"
      },
      "approver": {
        "id": 1,
        "name": "Super Admin",
        "email": "superadmin@primeacademy.com"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-20T14:30:00.000Z"
    }
  }
}
```

**Field Requirements:**
- `approve` (required): Boolean
  - `true` → Sets `status='approved'`
  - `false` → Sets `status='rejected'`

**Behavior:**
- Updates `status` to 'approved' or 'rejected'
- Sets `approverId` to current SuperAdmin user ID
- Updates `updatedAt` timestamp (response timestamp)

**Error Responses:**
- `400 Bad Request` - Missing or invalid approve field, or change request already processed
- `403 Forbidden` - Not a SuperAdmin
- `404 Not Found` - Change request not found

**Notes:**
- Only SuperAdmin can respond to approval requests
- Cannot respond to requests that are already approved or rejected
- Response timestamp is recorded in `updatedAt` field

---

## Example Usage

### Get Students Without Batch
```bash
curl -X GET http://localhost:3000/api/reports/students-without-batch \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Batch Attendance
```bash
curl -X GET "http://localhost:3000/api/reports/batch-attendance?batchId=1&from=2024-02-01&to=2024-02-29" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Pending Payments
```bash
curl -X GET http://localhost:3000/api/reports/pending-payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Approval Request
```bash
curl -X POST http://localhost:3000/api/approvals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "batch",
    "entityId": 1,
    "reason": "Request to change batch schedule"
  }'
```

### Respond to Approval
```bash
curl -X POST http://localhost:3000/api/approvals/1/respond \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approve": true
  }'
```

---

## Summary

### Reporting Endpoints
- ✅ `GET /api/reports/students-without-batch` - Students not in any batch
- ✅ `GET /api/reports/batch-attendance` - Batch attendance statistics (total sessions, total attendance count, attendance %)
- ✅ `GET /api/reports/pending-payments` - Students with pending payments

### Approval Endpoints
- ✅ `POST /api/approvals` - Create change request (status='pending')
- ✅ `POST /api/approvals/:id/respond` - SuperAdmin approve/reject (updates status and response timestamp)

All endpoints require authentication and have proper authorization checks.

