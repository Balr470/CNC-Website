const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/storage"); // S3/R2 client
const { v4: uuid } = require("uuid");

const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const logger = require('../config/logger');

module.exports = async (fileBuffer, mimeType, originalName) => {
    const ext = path.extname(originalName || '');
    const fileName = `${uuid()}${ext}`;

    // Check if R2 is fully configured (and not the default placeholders)
    if (
        process.env.R2_BUCKET_NAME &&
        process.env.R2_ACCESS_KEY &&
        process.env.R2_ENDPOINT &&
        !process.env.R2_BUCKET_NAME.includes('your-')
    ) {
        try {
            const key = `designs/${fileName}`;
            await r2.send(
                new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: mimeType
                })
            );
            
            logger.info({
                message: 'File uploaded to R2 successfully',
                fileName: originalName,
                fileSize: fileBuffer.length,
                key
            });
            
            return key; // store in DB (e.g., "designs/uuid.ext")
        } catch (error) {
            logger.error({
                message: 'R2 upload error',
                error: error.message,
                fileName: originalName
            });
            throw new Error(`R2 upload failed: ${error.message}`);
        }
    } else {
        // Fallback: Store locally if R2 is not configured
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'designs');
        await fsPromises.mkdir(uploadDir, { recursive: true });

        const localFilePath = path.join(uploadDir, fileName);
        await fsPromises.writeFile(localFilePath, fileBuffer);

        return `local-designs/${fileName}`; // Local path string format
    }
};
