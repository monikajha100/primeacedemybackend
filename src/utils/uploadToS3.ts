import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface UploadToS3Options {
  filePath: string;
  originalName: string;
  folder?: string; // Optional folder in S3 bucket (e.g., 'portfolios', 'documents')
}

/**
 * Upload a file to AWS S3
 * @param options Upload options
 * @returns Promise with S3 file URL
 */
export const uploadToS3 = async (options: UploadToS3Options): Promise<string> => {
  try {
    const { filePath, originalName, folder = 'uploads' } = options;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    // Read file
    const fileContent = fs.readFileSync(filePath);

    // Generate unique filename
    const ext = path.extname(originalName);
    const fileName = `${folder}/${uuidv4()}${ext}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: getContentType(ext),
      ACL: 'public-read', // Make file publicly accessible (or use 'private' for private files)
    });

    await s3Client.send(command);

    // Return S3 URL
    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    return s3Url;
  } catch (error) {
    throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Upload multiple files to S3
 * @param files Array of file paths and names
 * @returns Promise with array of S3 URLs
 */
export const uploadMultipleToS3 = async (
  files: Array<{ filePath: string; originalName: string; folder?: string }>
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToS3({
        filePath: file.filePath,
        originalName: file.originalName,
        folder: file.folder,
      })
    );

    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    throw new Error(`Failed to upload files to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get content type based on file extension
 */
const getContentType = (ext: string): string => {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };

  return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Delete local file after S3 upload (optional cleanup)
 */
export const deleteLocalFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.error('Error deleting local file:', error);
  }
};

