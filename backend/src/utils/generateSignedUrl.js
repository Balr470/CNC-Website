const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/storage');
const path = require('path');
const logger = require('../config/logger');

const generateSignedUrl = async (fileKey) => {
    if (!fileKey || typeof fileKey !== 'string') {
        throw new Error('Invalid file key');
    }

    // ✅ SECURITY: Prevent path traversal attacks.
    const sanitizedKey = fileKey
        .replace(/\0/g, '')           // Remove null bytes
        .replace(/\.\.\/|\.\.\\/g, '') // Strip ../ and ..\
        .trim();

    if (!sanitizedKey || sanitizedKey !== fileKey) {
        throw new Error('Invalid or malicious file key detected');
    }

    // Handling local files (development only fallback)
    if (sanitizedKey.startsWith('local-designs/')) {
        const fileName = path.basename(sanitizedKey.replace('local-designs/', ''));
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        return `${baseUrl}/uploads/designs/${fileName}`;
    }

    const expiry = parseInt(process.env.SIGNED_URL_EXPIRY) || 300; // default 5 minutes
    
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: sanitizedKey,
        });

        // Generate the presigned URL that expires in `expiry` seconds
        const url = await getSignedUrl(s3Client, command, { expiresIn: expiry });
        return url;
    } catch (error) {
        logger.error({ message: "Error generating signed URL", error: error.message, key: sanitizedKey });
        throw new Error('Could not generate secure download link');
    }
};

module.exports = generateSignedUrl;
