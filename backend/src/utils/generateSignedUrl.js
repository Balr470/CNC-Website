const cloudinary = require('../config/cloudinary');
const path = require('path');

const generateSignedUrl = async (fileKey) => {
    if (!fileKey || typeof fileKey !== 'string') {
        throw new Error('Invalid file key');
    }

    // ✅ SECURITY: Prevent path traversal attacks.
    // Strip null bytes, parent directory sequences, and normalize separators.
    const sanitizedKey = fileKey
        .replace(/\0/g, '')           // Remove null bytes
        .replace(/\.\.\/|\.\.\\/g, '') // Strip ../ and ..\
        .trim();

    if (!sanitizedKey || sanitizedKey !== fileKey) {
        throw new Error('Invalid or malicious file key detected');
    }

    // Handling local files (development only)
    if (sanitizedKey.startsWith('local-designs/')) {
        const fileName = path.basename(sanitizedKey.replace('local-designs/', ''));
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        return `${baseUrl}/uploads/designs/${fileName}`;
    }

    const expiry = parseInt(process.env.SIGNED_URL_EXPIRY) || 300; // default 5 minutes
    const expiresAt = Math.floor(Date.now() / 1000) + expiry;

    try {
        const url = cloudinary.utils.private_download_url(sanitizedKey, 'raw', {
            expires_at: expiresAt,
            attachment: true
        });
        return url;
    } catch (error) {
        console.error("Error generating signed URL", error);
        throw new Error('Could not generate secure download link');
    }
};

module.exports = generateSignedUrl;
