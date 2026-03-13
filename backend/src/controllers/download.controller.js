const Design = require('../models/Design.model');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const downloadService = require('../services/download.service');

exports.getDownloadLink = async (req, res, next) => {
    try {
        const { designId } = req.params;

        if (!designId || !designId.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 400, 'Invalid Design ID format');
        }

        // 1. Find the design
        // Use +fileKey to override select: false in schema
        const design = await Design.findById(designId).select('+fileKey');

        if (!design) {
            return errorResponse(res, 404, 'Design not found');
        }

        // 2. Business Logic Execution
        const signedUrl = await downloadService.authorizeAndGenerateUrl(design, req.user);

        if (!signedUrl) {
            return errorResponse(res, 403, 'Please purchase this design to download');
        }

        successResponse(res, 200, {
            data: {
                downloadUrl: signedUrl
            }
        });

    } catch (error) {
        next(error);
    }
};
