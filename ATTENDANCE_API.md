# Attendance Management API Documentation

## Core Attendance Logic

This document describes the core attendance management endpoints for Prime Academy.

---

## 1. POST /api/sessions

Create a new session for a batch.

**Authentication:** Required (Bearer token)
**Authorization:** Faculty, Admin, or SuperAdmin

**Request Body:**
```json
{
  "batchId": 1,
  "facultyId": 2,
  "date": "2024-02-01",
  "startTime": "10:00",
  "endTime": "12:00",
  "topic": "Introduction to Digital Art",
  "isBackup": false
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": 1,
      "batchId": 1,
      "facultyId": 2,
      "date": "2024-02-01",
      "startTime": "10:00",
      "endTime": "12:00",
      "topic": "Introduction to Digital Art",
      "isBackup": false,
      "status": "scheduled",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Field Requirements:**
- `batchId` (required): ID of the batch
- `facultyId` (required): ID of the faculty member
- `date` (required): Session date in YYYY-MM-DD format
- `startTime` (required): Start time in HH:mm or HH:mm:ss format
- `endTime` (required): End time in HH:mm or HH:mm:ss format
- `topic` (optional): Session topic/title
- `isBackup` (optional): Boolean, default false

**Notes:**
- Session is automatically created with `status='scheduled'`
- Faculty must exist and have `role='faculty'`
- Batch must exist

---

## 2. POST /api/sessions/:id/checkin

Check-in to start a session. Faculty-only endpoint.

**Authentication:** Required (Bearer token)
**Authorization:** Faculty role only (must be the assigned faculty for the session)

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Session checked in successfully",
  "data": {
    "session": {
      "id": 1,
      "status": "ongoing",
      "actualStartAt": "2024-02-01T10:05:00.000Z",
      "updatedAt": "2024-02-01T10:05:00.000Z"
    }
  }
}
```

**Rules:**
- ✅ Only allowed if `status='scheduled'`
- ✅ Updates: `status='ongoing'`, `actualStartAt=now()`
- ✅ Only the assigned faculty can check-in
- ❌ Cannot check-in if status is not 'scheduled'

**Error Responses:**
- `400 Bad Request` - Session status is not 'scheduled'
- `403 Forbidden` - User is not the assigned faculty
- `404 Not Found` - Session not found

---

## 3. POST /api/sessions/:id/checkout

Check-out to end a session. Faculty-only endpoint.

**Authentication:** Required (Bearer token)
**Authorization:** Faculty role only (must be the assigned faculty for the session)

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Session checked out successfully",
  "data": {
    "session": {
      "id": 1,
      "status": "completed",
      "actualStartAt": "2024-02-01T10:05:00.000Z",
      "actualEndAt": "2024-02-01T12:00:00.000Z",
      "updatedAt": "2024-02-01T12:00:00.000Z"
    }
  }
}
```

**Rules:**
- ✅ Only allowed if `status='ongoing'`
- ✅ Updates: `status='completed'`, `actualEndAt=now()`
- ✅ Only the assigned faculty can check-out
- ❌ Cannot check-out if status is not 'ongoing'
- ❌ Cannot check-out if session was never checked in

**Error Responses:**
- `400 Bad Request` - Session status is not 'ongoing' or session was never checked in
- `403 Forbidden` - User is not the assigned faculty
- `404 Not Found` - Session not found

---

## 4. POST /api/sessions/:id/attendance

Mark attendance for students in a session.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "studentId": 3,
  "status": "present"
}
```

**Request Body (Manual Present):**
```json
{
  "studentId": 3,
  "status": "manual_present"
}
```

**Response (201 Created / 200 Updated):**
```json
{
  "status": "success",
  "message": "Attendance marked successfully",
  "data": {
    "attendance": {
      "id": 1,
      "sessionId": 1,
      "studentId": 3,
      "status": "present",
      "isManual": false,
      "markedBy": 2,
      "markedAt": "2024-02-01T10:15:00.000Z",
      "createdAt": "2024-02-01T10:15:00.000Z",
      "updatedAt": "2024-02-01T10:15:00.000Z"
    }
  }
}
```

**Response (Manual Present):**
```json
{
  "status": "success",
  "message": "Attendance marked successfully",
  "data": {
    "attendance": {
      "id": 2,
      "sessionId": 1,
      "studentId": 4,
      "status": "manual_present",
      "isManual": true,
      "markedBy": 2,
      "markedAt": "2024-02-01T10:20:00.000Z",
      "createdAt": "2024-02-01T10:20:00.000Z",
      "updatedAt": "2024-02-01T10:20:00.000Z"
    }
  }
}
```

**Field Requirements:**
- `studentId` (required): ID of the student
- `status` (required): One of `'present'`, `'absent'`, or `'manual_present'`

**Automatic Behavior:**
- ✅ If `status='manual_present'`, automatically sets:
  - `isManual=true`
  - `markedBy=session.facultyId` (the faculty assigned to the session)
- ✅ If attendance already exists for this student in this session, it will be updated
- ✅ If attendance doesn't exist, a new record is created

**Attendance Status Values:**
- `present` - Student is present
- `absent` - Student is absent
- `manual_present` - Student marked present manually by faculty (sets `isManual=true`)

**Error Responses:**
- `400 Bad Request` - Missing studentId or status, or invalid status value
- `404 Not Found` - Session or student not found
- `500 Internal Server Error` - Server error

---

## Workflow Example

### Complete Session Lifecycle

1. **Create Session**
   ```bash
   POST /api/sessions
   # Creates session with status='scheduled'
   ```

2. **Faculty Check-in**
   ```bash
   POST /api/sessions/1/checkin
   # Updates: status='ongoing', actualStartAt=now()
   ```

3. **Mark Attendance (Multiple Students)**
   ```bash
   POST /api/sessions/1/attendance
   # Student 1 - Present
   { "studentId": 3, "status": "present" }
   
   # Student 2 - Absent
   { "studentId": 4, "status": "absent" }
   
   # Student 3 - Manual Present
   { "studentId": 5, "status": "manual_present" }
   ```

4. **Faculty Check-out**
   ```bash
   POST /api/sessions/1/checkout
   # Updates: status='completed', actualEndAt=now()
   ```

---

## Prime Academy Rules

1. **Cannot check-in without faculty**: Session must have an active faculty assigned
2. **Cannot end without check-out**: Session must be checked out before completion
3. **Manual attendance flag**: When `status='manual_present'`, `isManual` is automatically set to `true` and `markedBy` is set to the session's faculty ID

---

## Example Usage

### Create Session
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "facultyId": 2,
    "date": "2024-02-01",
    "startTime": "10:00",
    "endTime": "12:00",
    "topic": "Introduction to Digital Art"
  }'
```

### Check-in Session
```bash
curl -X POST http://localhost:3000/api/sessions/1/checkin \
  -H "Authorization: Bearer FACULTY_TOKEN"
```

### Mark Attendance
```bash
curl -X POST http://localhost:3000/api/sessions/1/attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": 3,
    "status": "present"
  }'
```

### Check-out Session
```bash
curl -X POST http://localhost:3000/api/sessions/1/checkout \
  -H "Authorization: Bearer FACULTY_TOKEN"
```

