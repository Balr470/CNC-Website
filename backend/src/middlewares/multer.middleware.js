const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { v4: uuid } = require('uuid');
const { CNC_FILE_EXTENSIONS } = require('../constants/design.constants');
const { MAX_CNC_FILE_SIZE_BYTES } = require('../constants/upload.constants');

const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'cnc/previews',
        resource_type: 'image',
        type: 'upload',
        allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
        overwrite: false,
        public_id: () => uuid(),
    }
});

// Preview images go directly to Cloudinary. CNC files are buffered first and then uploaded
// as protected raw assets via the service layer.
const hybridStorage = {
    _handleFile(req, file, cb) {
        if (file.fieldname === 'mainImage' || file.fieldname === 'additionalImages') {
            imageStorage._handleFile(req, file, cb);
            return;
        }

        const path = require('path');
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!CNC_FILE_EXTENSIONS.includes(ext)) {
            return cb(new Error(`Invalid CNC file type "${ext}". Allowed: ${CNC_FILE_EXTENSIONS.join(', ')}`));
        }

        const chunks = [];
        file.stream.on('data', (chunk) => chunks.push(chunk));
        file.stream.on('end', () => {
            file.buffer = Buffer.concat(chunks);
            cb(null, { buffer: file.buffer });
        });
        file.stream.on('error', cb);
    },
    _removeFile(req, file, cb) {
        if ((file.fieldname === 'mainImage' || file.fieldname === 'additionalImages') && imageStorage._removeFile) {
            imageStorage._removeFile(req, file, cb);
            return;
        }
        cb(null);
    }
};

const upload = multer({
    storage: hybridStorage,
    limits: {
        fileSize: MAX_CNC_FILE_SIZE_BYTES
    }
});

module.exports = { upload };
