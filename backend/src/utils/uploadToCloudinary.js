const cloudinary = require("../config/cloudinary");
const { v4: uuid } = require("uuid");
const stream = require("stream");
const path = require("path");

module.exports = async (fileBuffer, mimeType, originalName) => {
    return new Promise((resolve, reject) => {
        const ext = path.extname(originalName || '');
        const fileName = `${uuid()}${ext}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                folder: 'cnc/designs',
                public_id: fileName,
                type: 'private',
                overwrite: false,
                use_filename: false,
                unique_filename: false,
                access_mode: 'authenticated'
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return reject(new Error('Failed to upload file to Cloudinary'));
                }

                // Return the public_id representing the file in Cloudinary
                resolve(result.public_id);
            }
        );

        stream.Readable.from(fileBuffer).pipe(uploadStream);
    });
};
