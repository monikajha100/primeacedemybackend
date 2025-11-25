# Payment & Portfolio Management API Documentation

## Payment Endpoints

### POST /api/payments

Create a PaymentTransaction for a student.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "studentId": 3,
  "amount": 5000.00,
  "dueDate": "2024-03-01",
  "status": "pending",
  "receiptUrl": "https://example.com/receipts/receipt123.pdf"
}
```

**Request Body (Paid):**
```json
{
  "studentId": 3,
  "amount": 5000.00,
  "dueDate": "2024-03-01",
  "status": "paid",
  "receiptUrl": "https://example.com/receipts/receipt123.pdf"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Payment transaction created successfully",
  "data": {
    "payment": {
      "id": 1,
      "studentId": 3,
      "amount": 5000.00,
      "dueDate": "2024-03-01T00:00:00.000Z",
      "paidAt": null,
      "status": "pending",
      "receiptUrl": "https://example.com/receipts/receipt123.pdf",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Field Requirements:**
- `studentId` (required): ID of the student
- `amount` (required): Decimal value > 0
- `dueDate` (required): Date in YYYY-MM-DD format
- `status` (optional): 'pending' or 'paid' (default: 'pending')
- `receiptUrl` (optional): URL to receipt document

**Notes:**
- If `status='paid'`, `paidAt` is automatically set to current timestamp
- Amount must be greater than 0
- Student must exist and have `role='student'`

---

### GET /api/students/:id/payments

List all payments for a specific student.

**Authentication:** Required (Bearer token)
**Authorization:** Students can only view their own payments. Admins can view any student's payments.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "student": {
      "id": 3,
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "payments": [
      {
        "id": 1,
        "studentId": 3,
        "amount": 5000.00,
        "dueDate": "2024-03-01T00:00:00.000Z",
        "paidAt": null,
        "status": "pending",
        "receiptUrl": "https://example.com/receipts/receipt123.pdf",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "studentId": 3,
        "amount": 3000.00,
        "dueDate": "2024-02-15T00:00:00.000Z",
        "paidAt": "2024-02-14T15:30:00.000Z",
        "status": "paid",
        "receiptUrl": "https://example.com/receipts/receipt456.pdf",
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-02-14T15:30:00.000Z"
      }
    ],
    "count": 2
  }
}
```

**Response Fields:**
- `student`: Student information (id, name, email)
- `payments`: Array of payment transactions
- `count`: Total number of payments

**Error Responses:**
- `400 Bad Request` - Invalid student ID
- `403 Forbidden` - User trying to view another student's payments (not admin)
- `404 Not Found` - Student not found

**Notes:**
- Payments are ordered by dueDate (most recent first), then by createdAt
- Students can only view their own payments
- Admins and SuperAdmins can view any student's payments

---

## Portfolio Endpoints

### POST /api/students/:id/portfolio

Upload portfolio for a student. Accepts multiple file URLs in `files[]` array.

**Authentication:** Required (Bearer token)
**Authorization:** Students can upload their own portfolios. Admins can upload for any student.

**Request Body:**
```json
{
  "batchId": 1,
  "files": [
    "https://example.com/portfolios/project1.jpg",
    "https://example.com/portfolios/project2.jpg",
    "https://example.com/portfolios/project3.pdf"
  ]
}
```

**Response (201 Created / 200 Updated):**
```json
{
  "status": "success",
  "message": "Portfolio uploaded successfully",
  "data": {
    "portfolio": {
      "id": 1,
      "studentId": 3,
      "batchId": 1,
      "files": [
        "https://example.com/portfolios/project1.jpg",
        "https://example.com/portfolios/project2.jpg",
        "https://example.com/portfolios/project3.pdf"
      ],
      "status": "pending",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Field Requirements:**
- `batchId` (required): ID of the batch
- `files` (required): Array of file URLs (strings)

**Validation:**
- `files` must be an array
- At least one file URL is required
- Student must be enrolled in the specified batch
- If portfolio already exists, it will be updated and status reset to 'pending'

**Response Behavior:**
- Creates new portfolio with `status='pending'` if it doesn't exist
- Updates existing portfolio and resets `status='pending'` when files are updated
- Clears `approvedBy` and `approvedAt` when updating

**Error Responses:**
- `400 Bad Request` - Missing fields, invalid files array, or student not enrolled in batch
- `403 Forbidden` - User cannot upload portfolio for this student
- `404 Not Found` - Student or batch not found

---

### POST /api/portfolio/:id/approve

Approve or reject a portfolio. Admin/SuperAdmin only.

**Authentication:** Required (Bearer token)
**Authorization:** Admin or SuperAdmin role required

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
  "message": "Portfolio approved successfully",
  "data": {
    "portfolio": {
      "id": 1,
      "studentId": 3,
      "studentName": "Jane Smith",
      "studentEmail": "jane@example.com",
      "batchId": 1,
      "status": "approved",
      "approvedBy": 1,
      "approvedAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  }
}
```

**Response (200 OK - Rejected):**
```json
{
  "status": "success",
  "message": "Portfolio rejected successfully",
  "data": {
    "portfolio": {
      "id": 1,
      "studentId": 3,
      "studentName": "Jane Smith",
      "studentEmail": "jane@example.com",
      "batchId": 1,
      "status": "rejected",
      "approvedBy": 1,
      "approvedAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
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
- Sets `approvedBy` to current user's ID
- Sets `approvedAt` to current timestamp

**Error Responses:**
- `400 Bad Request` - Missing or invalid `approve` field
- `403 Forbidden` - Not an Admin or SuperAdmin
- `404 Not Found` - Portfolio not found

---

## Example Usage

### Create Payment
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": 3,
    "amount": 5000.00,
    "dueDate": "2024-03-01",
    "status": "pending",
    "receiptUrl": "https://example.com/receipts/receipt123.pdf"
  }'
```

### Get Student Payments
```bash
curl -X GET http://localhost:3000/api/students/3/payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Upload Portfolio
```bash
curl -X POST http://localhost:3000/api/students/3/portfolio \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "files": [
      "https://example.com/portfolios/project1.jpg",
      "https://example.com/portfolios/project2.jpg"
    ]
  }'
```

### Approve Portfolio
```bash
curl -X POST http://localhost:3000/api/portfolio/1/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approve": true
  }'
```

### Reject Portfolio
```bash
curl -X POST http://localhost:3000/api/portfolio/1/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approve": false
  }'
```

---

## Summary

### Payment Endpoints
- ✅ `POST /api/payments` - Create payment transaction
- ✅ `GET /api/students/:id/payments` - List student payments

### Portfolio Endpoints
- ✅ `POST /api/students/:id/portfolio` - Upload portfolio (accepts multiple file URLs)
- ✅ `POST /api/portfolio/:id/approve` - Approve/reject portfolio (Admin/SuperAdmin only)

All endpoints require authentication and have proper authorization checks.

