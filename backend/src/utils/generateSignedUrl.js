const path = require('path');
const logger = require('../config/logger');
const cloudinary = require('../config/cloudinary');
const { configError, isConfigured, tokens } = require('../config/appwrite');
const { parseAppwriteFileKey } = require('./fileStorageKey');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const r2 = require('../config/storage');

const getCloudinaryPrivateDownloadUrl = (fileKey, expiry) => {
    if (!fileKey || !path.extname(fileKey || '')) {
        throw new Error('Invalid Cloudinary file key');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiry;

    // Raw uploads are stored with the extension already embedded in public_id
    // (for example: cnc/designs/uuid.dxf). Passing the extension separately
    // causes Cloudinary to look up the wrong resource.
    return cloudinary.utils.private_download_url(fileKey, undefined, {
        resource_type: 'raw',
        type: 'private',
        expires_at: expiresAt,
        attachment: true,
    });
};

const getAppwriteDownloadDescriptor = async (fileKey, expiry) => {
    if (!isConfigured) {
        throw new Error(configError || 'Appwrite storage is not configured on the backend.');
    }

    const parsed = parseAppwriteFileKey(fileKey);
    if (!parsed) {
        throw new Error('Invalid Appwrite file key');
    }

    const expire = new Date(Date.now() + (expiry * 1000)).toISOString();
    let token;
    try {
        token = await tokens.createFileToken({
            bucketId: parsed.bucketId,
            fileId: parsed.fileId,
            expire,
        });
    } catch (error) {
        logger.error({
            message: 'Error generating Appwrite download token',
            error: error.message,
            type: error.type,
            code: error.code,
            bucketId: parsed.bucketId,
            fileId: parsed.fileId,
            fileKey,
        });
        throw new Error(error.message || 'Failed to generate Appwrite download token');
    }

    return {
        provider: 'appwrite',
        bucketId: parsed.bucketId,
        fileId: parsed.fileId,
        token: token.secret,
    };
};

const getR2DownloadDescriptor = async (fileKey, expiry) => {
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_ENDPOINT) {
        throw new Error('R2 storage is not configured');
    }

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
        });
        
        const signedUrl = await getSignedUrl(r2, command, { expiresIn: expiry });
        
        return {
            provider: 'r2',
            downloadUrl: signedUrl,
        };
    } catch (error) {
        logger.error({
            message: 'Error generating R2 download URL',
            error: error.message,
            fileKey,
        });
        throw new Error(error.message || 'Failed to generate R2 download URL');
    }
};

const generateSignedUrl = async (fileKey) => {
    if (!fileKey || typeof fileKey !== 'string') {
        throw new Error('Invalid file key');
    }

    const sanitizedKey = fileKey
        .replace(/\0/g, '')
        .replace(/\.\.\/|\.\.\\/g, '')
        .trim();

    if (!sanitizedKey || sanitizedKey !== fileKey) {
        throw new Error('Invalid or malicious file key detected');
    }

    const expiry = parseInt(process.env.SIGNED_URL_EXPIRY, 10) || 300;

    // Check for R2 file keys (starts with 'designs/')
    if (sanitizedKey.startsWith('designs/')) {
        return getR2DownloadDescriptor(sanitizedKey, expiry);
    }

    if (sanitizedKey.startsWith('appwrite/')) {
        return getAppwriteDownloadDescriptor(sanitizedKey, expiry);
    }

    if (sanitizedKey.startsWith('cnc/designs/')) {
        return {
            provider: 'direct-url',
            downloadUrl: getCloudinaryPrivateDownloadUrl(sanitizedKey, expiry),
        };
    }

    if (sanitizedKey.startsWith('local-designs/')) {
        const fileName = path.basename(sanitizedKey.replace('local-designs/', ''));
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        return {
            provider: 'direct-url',
            downloadUrl: `${baseUrl}/uploads/designs/${fileName}`,
        };
    }

    logger.error({ message: 'Error generating signed URL', error: 'Unsupported file key origin', key: sanitizedKey });
    throw new Error('Could not generate secure download link');
};

module.exports = generateSignedUrl;
