# File Upload API Documentation

## Overview

The file upload system supports local file storage using Multer and optional AWS S3 integration. All uploads require authentication and support multiple files with validation.

## Features

- ✅ Multiple file upload (up to 10 files at once)
- ✅ File type validation (PDF, JPG, PNG only)
- ✅ File size limit (5MB per file)
- ✅ Unique filename generation
- ✅ Local storage in `uploads/` directory
- ✅ Optional AWS S3 integration
- ✅ Static file serving

---

## Upload Endpoint

### POST /api/upload

Upload multiple files. Returns file URLs that can be used in other endpoints (e.g., portfolio upload, document upload).

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Request:**
- Field name: `files` (array of files)
- Allowed file types: PDF, JPG, PNG
- Maximum file size: 5MB per file
- Maximum files: 10 per request

**Example Request (cURL):**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/document1.pdf" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.png"
```

**Example Request (JavaScript/FormData):**
```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('files', file3);

const response = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "3 file(s) uploaded successfully",
  "data": {
    "files": [
      {
        "originalName": "document1.pdf",
        "filename": "document1-1704067200000-123456789.pdf",
        "size": 245760,
        "mimetype": "application/pdf",
        "url": "http://localhost:3000/uploads/document1-1704067200000-123456789.pdf"
      },
      {
        "originalName": "image1.jpg",
        "filename": "image1-1704067200001-987654321.jpg",
        "size": 524288,
        "mimetype": "image/jpeg",
        "url": "http://localhost:3000/uploads/image1-1704067200001-987654321.jpg"
      },
      {
        "originalName": "image2.png",
        "filename": "image2-1704067200002-456789123.png",
        "size": 1024000,
        "mimetype": "image/png",
        "url": "http://localhost:3000/uploads/image2-1704067200002-456789123.png"
      }
    ],
    "urls": [
      "http://localhost:3000/uploads/document1-1704067200000-123456789.pdf",
      "http://localhost:3000/uploads/image1-1704067200001-987654321.jpg",
      "http://localhost:3000/uploads/image2-1704067200002-456789123.png"
    ],
    "count": 3
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid file type:**
```json
{
  "status": "error",
  "message": "Invalid file type. Only PDF, JPG, and PNG files are allowed. Received: application/zip"
}
```

**400 Bad Request - File size exceeded:**
```json
{
  "status": "error",
  "message": "File size exceeds 5MB limit"
}
```

**400 Bad Request - Too many files:**
```json
{
  "status": "error",
  "message": "Too many files. Maximum 10 files allowed"
}
```

**400 Bad Request - No files:**
```json
{
  "status": "error",
  "message": "No files uploaded"
}
```

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

---

## File Access

Uploaded files are served statically at:
```
GET /uploads/:filename
```

**Example:**
```
http://localhost:3000/uploads/document1-1704067200000-123456789.pdf
```

---

## File Validation

### Allowed File Types
- **PDF**: `application/pdf`
- **JPG/JPEG**: `image/jpeg`, `image/jpg`
- **PNG**: `image/png`

### File Size Limits
- Maximum size: **5MB per file**
- Maximum files per request: **10 files**

### Filename Format
Files are stored with unique names to prevent conflicts:
```
{original-name}-{timestamp}-{random}.{extension}
```

Example: `document-1704067200000-123456789.pdf`

---

## AWS S3 Integration (Optional)

The system includes a utility for AWS S3 integration (`src/utils/uploadToS3.ts`). To enable S3 uploads:

### 1. Install Dependencies (Already installed)
```bash
npm install @aws-sdk/client-s3 uuid
npm install --save-dev @types/uuid
```

### 2. Configure Environment Variables

Add to `.env`:
```env
# AWS S3 Configuration (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

### 3. Use S3 Utility

**Single File Upload:**
```typescript
import { uploadToS3 } from './utils/uploadToS3';

const s3Url = await uploadToS3({
  filePath: './uploads/document.pdf',
  originalName: 'document.pdf',
  folder: 'portfolios' // Optional: organizes files in S3
});
```

**Multiple Files Upload:**
```typescript
import { uploadMultipleToS3 } from './utils/uploadToS3';

const urls = await uploadMultipleToS3([
  { filePath: './uploads/file1.pdf', originalName: 'file1.pdf', folder: 'documents' },
  { filePath: './uploads/file2.jpg', originalName: 'file2.jpg', folder: 'photos' },
]);
```

**Cleanup Local Files After S3 Upload:**
```typescript
import { uploadToS3, deleteLocalFile } from './utils/uploadToS3';

const s3Url = await uploadToS3({
  filePath: './uploads/document.pdf',
  originalName: 'document.pdf'
});

// Delete local file after successful S3 upload
deleteLocalFile('./uploads/document.pdf');
```

### 4. Update Upload Controller (Optional)

To automatically upload to S3 after local storage, modify `src/controllers/upload.controller.ts`:

```typescript
import { uploadToS3 } from '../utils/uploadToS3';

// After saving locally, optionally upload to S3
if (process.env.USE_S3 === 'true') {
  const s3Url = await uploadToS3({
    filePath: file.path,
    originalName: file.originalname,
    folder: 'uploads'
  });
  // Use S3 URL instead of local URL
}
```

---

## Configuration

### Environment Variables

Add to `.env`:

```env
# Base URL for file URLs (optional, defaults to http://localhost:3000)
BASE_URL=http://localhost:3000

# AWS S3 Configuration (optional, for S3 integration)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
USE_S3=false
```

### Directory Structure

```
backend/
├── uploads/           # Local upload directory
│   └── .gitkeep      # Keeps directory in git
├── src/
│   ├── middleware/
│   │   └── upload.middleware.ts  # Multer configuration
│   ├── controllers/
│   │   └── upload.controller.ts  # Upload handler
│   ├── routes/
│   │   └── upload.routes.ts      # Upload routes
│   └── utils/
│       └── uploadToS3.ts         # S3 integration utility
```

---

## Usage Examples

### Upload Files for Portfolio

```javascript
// 1. Upload files first
const uploadResponse = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data } = await uploadResponse.json();
const fileUrls = data.urls; // Array of file URLs

// 2. Use URLs in portfolio upload
await fetch('http://localhost:3000/api/students/3/portfolio', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    batchId: 1,
    files: fileUrls
  })
});
```

### Upload Documents for Student Profile

```javascript
// Upload documents
const formData = new FormData();
formData.append('files', document1);
formData.append('files', document2);

const response = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data } = await response.json();
const documentUrls = data.urls;
```

---

## Security Notes

1. **Authentication Required**: All uploads require a valid JWT token
2. **File Type Validation**: Only PDF, JPG, and PNG files are accepted
3. **Size Limits**: 5MB per file prevents abuse
4. **Unique Filenames**: Prevents file overwrite attacks
5. **Static File Serving**: Files are served via Express static middleware

---

## Troubleshooting

### File Not Found (404)
- Ensure the `uploads/` directory exists
- Check that the file was successfully uploaded
- Verify the filename matches exactly

### Upload Fails
- Check file size (must be ≤ 5MB)
- Verify file type (PDF, JPG, PNG only)
- Ensure authentication token is valid
- Check server logs for detailed errors

### S3 Upload Fails
- Verify AWS credentials in `.env`
- Check S3 bucket name and region
- Ensure bucket permissions allow PutObject
- Verify IAM user has S3 write permissions

---

## Summary

✅ **POST /api/upload** - Upload multiple files (PDF, JPG, PNG)
✅ **File Validation** - Type and size validation enforced
✅ **Local Storage** - Files stored in `uploads/` directory
✅ **Static Serving** - Files accessible via `/uploads/:filename`
✅ **AWS S3 Support** - Optional S3 integration utility included
✅ **Unique Filenames** - Prevents conflicts and overwrites

