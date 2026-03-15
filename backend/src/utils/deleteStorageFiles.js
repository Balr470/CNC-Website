const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const r2 = require('../config/storage');
const { configError, isConfigured, storage: appwriteStorage } = require('../config/appwrite');
const cloudinary = require('../config/cloudinary');
const logger = require('../config/logger');

const deleteFromR2 = async (fileKey) => {
    if (!fileKey) {
        console.log('[R2 DELETE] No file key provided');
        return { success: false, error: 'No file key provided' };
    }

    console.log('[R2 DELETE] Attempting to delete:', fileKey);
    console.log('[R2 DELETE] Bucket:', process.env.R2_BUCKET_NAME);
    console.log('[R2 DELETE] R2 configured:', !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY));

    // Check if it's an R2 key - check for 'designs/' prefix
    if (!fileKey.startsWith('designs/')) {
        console.log('[R2 DELETE] Not an R2 key format. Key starts with:', fileKey.substring(0, 20));
        return { success: false, error: 'Not an R2 file key', keyFormat: fileKey.substring(0, 30) };
    }

    // Check R2 is configured
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY) {
        console.log('[R2 DELETE] R2 not configured');
        return { success: false, error: 'R2 not configured' };
    }

    try {
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
        });
        
        console.log('[R2 DELETE] Sending delete command...');
        await r2.send(deleteCommand);
        
        logger.info({ message: 'File deleted from R2', fileKey });
        console.log('[R2 DELETE] SUCCESS! File deleted:', fileKey);
        return { success: true };
    } catch (error) {
        logger.error({ message: 'R2 delete error', error: error.message, fileKey });
        console.log('[R2 DELETE] FAILED:', error.message);
        return { success: false, error: error.message };
    }
};

const deleteFromAppwrite = async (fileKey) => {
    if (!fileKey) {
        return { success: false, error: 'No file key provided' };
    }

    console.log('[APPWRITE DELETE] Attempting to delete:', fileKey);

    if (!fileKey.startsWith('appwrite/')) {
        console.log('[APPWRITE DELETE] Skipping - not an Appwrite file');
        return { success: false, error: 'Not an Appwrite file key' };
    }

    if (!isConfigured) {
        return { success: false, error: 'Appwrite not configured' };
    }

    try {
        // Parse the file key to get bucketId and fileId
        const parts = fileKey.replace('appwrite/', '').split('/');
        const bucketId = parts[0];
        const fileId = parts[1];

        console.log('[APPWRITE DELETE] Parsed - bucketId:', bucketId, 'fileId:', fileId);

        await appwriteStorage.deleteFile({
            bucketId,
            fileId,
        });
        logger.info({ message: 'File deleted from Appwrite', fileId, bucketId });
        console.log('[APPWRITE DELETE] Success');
        return { success: true };
    } catch (error) {
        logger.error({ message: 'Appwrite delete error', error: error.message, fileKey });
        console.log('[APPWRITE DELETE] Error:', error.message);
        return { success: false, error: error.message };
    }
};

const deleteFromCloudinary = async (previewUrl) => {
    if (!previewUrl) {
        return { success: false, error: 'No preview URL provided' };
    }

    console.log('[CLOUDINARY DELETE] Attempting to delete:', previewUrl);

    if (!previewUrl.includes('cloudinary')) {
        console.log('[CLOUDINARY DELETE] Skipping - not a Cloudinary URL');
        return { success: false, error: 'Not a Cloudinary URL' };
    }

    try {
        // Extract public_id from URL
        const urlParts = previewUrl.split('/upload/');
        if (urlParts.length < 2) {
            return { success: false, error: 'Invalid Cloudinary URL format' };
        }
        
        let publicId = urlParts[1].split('.')[0];
        publicId = publicId.replace(/^v\d+\//, ''); // Remove version number if present

        console.log('[CLOUDINARY DELETE] Public ID:', publicId);

        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        logger.info({ message: 'Preview deleted from Cloudinary', publicId });
        console.log('[CLOUDINARY DELETE] Success');
        return { success: true };
    } catch (error) {
        logger.error({ message: 'Cloudinary delete error', error: error.message, previewUrl });
        console.log('[CLOUDINARY DELETE] Error:', error.message);
        return { success: false, error: error.message };
    }
};

const deleteDesignFiles = async (design) => {
    console.log('\n========== DELETE DESIGN FILES ==========');
    console.log('[DELETE] Design ID:', design._id);
    console.log('[DELETE] FileKey:', design.fileKey);
    console.log('[DELETE] FileKey type:', typeof design.fileKey);
    console.log('[DELETE] FileKey length:', design.fileKey ? design.fileKey.length : 0);
    console.log('[DELETE] Preview Images:', design.previewImages);
    console.log('========================================\n');

    const results = {
        cncFile: { success: false },
        preview: { success: false },
    };

    // Delete CNC file (R2 or Appwrite)
    if (design.fileKey) {
        const fileKey = design.fileKey;
        console.log('[DELETE] Processing CNC file with key:', fileKey);
        
        // Check for various possible R2 key formats
        const isR2Key = fileKey.startsWith('designs/') || 
                       fileKey.includes('r2.cloudflarestorage.com') ||
                       fileKey.startsWith('r2/');
        
        const isAppwriteKey = fileKey.startsWith('appwrite/');
        const isLocalKey = fileKey.startsWith('local-designs/');
        const isCloudinaryRaw = fileKey.startsWith('cnc/designs/');
        
        console.log('[DELETE] Key analysis:');
        console.log('  - Is R2 key:', isR2Key);
        console.log('  - Is Appwrite key:', isAppwriteKey);
        console.log('  - Is Local key:', isLocalKey);
        console.log('  - Is Cloudinary raw:', isCloudinaryRaw);
        
        if (isR2Key) {
            console.log('[DELETE] Detected R2 file - calling deleteFromR2');
            results.cncFile = await deleteFromR2(fileKey);
        } else if (isAppwriteKey) {
            console.log('[DELETE] Detected Appwrite file');
            results.cncFile = await deleteFromAppwrite(fileKey);
        } else if (isLocalKey) {
            console.log('[DELETE] Local file - skipping');
            results.cncFile = { success: true, note: 'Local file (not deleted)' };
        } else if (isCloudinaryRaw) {
            console.log('[DELETE] Cloudinary raw file - not supported');
            results.cncFile = { success: true, note: 'Cloudinary raw file (not supported for deletion)' };
        } else {
            console.log('[DELETE] Unknown file key format - attempting R2 delete anyway');
            // Try R2 delete anyway in case it's a different format
            results.cncFile = await deleteFromR2(fileKey);
        }
    } else {
        console.log('[DELETE] No fileKey found in design');
    }

    // Delete preview image (Cloudinary)
    if (design.previewImages && design.previewImages.length > 0) {
        for (const previewUrl of design.previewImages) {
            console.log('[DELETE] Processing preview:', previewUrl);
            const result = await deleteFromCloudinary(previewUrl);
            if (result.success) {
                results.preview = result;
            }
        }
    } else {
        console.log('[DELETE] No preview images found');
    }

    console.log('[DELETE] Final results:', results);
    return results;
};

module.exports = {
    deleteFromR2,
    deleteFromAppwrite,
    deleteFromCloudinary,
    deleteDesignFiles,
};
