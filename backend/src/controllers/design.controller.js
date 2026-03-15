const { successResponse, errorResponse } = require('../utils/responseHandler');
const designService = require('../services/design.service');
const xss = require('xss');
const validateWithZod = require('../utils/validateWithZod');
const { createDesignSchema, updateDesignSchema } = require('../validators/design.validator');

// Get all basic designs (public route)
exports.getAllDesigns = async (req, res) => {
    try {
        const { category, search, sort, page, limit, priceType, fileType } = req.query;
        const result = await designService.getAllDesigns({ category, search, sort, page, limit, priceType, fileType });

        successResponse(res, 200, {
            results: result.designs.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: { designs: result.designs }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

// Get single design Details
exports.getDesign = async (req, res) => {
    try {
        // BUG FIX #4: No ObjectId validation — invalid IDs like '123' throw
        // Mongoose CastError instead of returning a clean 404.
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 404, 'No design found with that ID');
        }

        const design = await designService.getDesignById(req.params.id);

        if (!design) {
            return errorResponse(res, 404, 'No design found with that ID');
        }

        successResponse(res, 200, {
            data: { design }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

// Get related designs
exports.getRelatedDesigns = async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 404, 'No design found with that ID');
        }

        const design = await designService.getDesignById(req.params.id);
        if (!design) {
            return errorResponse(res, 404, 'No design found with that ID');
        }

        const related = await designService.getRelatedDesigns(design._id, design.category);

        successResponse(res, 200, {
            results: related.length,
            data: { designs: related }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

// Create a design (Handled by multer upload preview and uploadCNC middlewares)
exports.createDesign = async (req, res) => {
    try {
        // ✅ XSS FIX: Sanitize text fields from multipart/form-data AFTER multer has parsed them.
        // The global xssSanitizer runs before multer, so req.body is empty at that point.
        const validatedDesign = validateWithZod(createDesignSchema, {
            title: xss(req.body.title || ''),
            description: xss(req.body.description || ''),
            category: xss(req.body.category || '').toLowerCase(),
            price: req.body.price,
        });

        if (!req.files || !req.files.preview || !req.files.cnc) {
            return errorResponse(res, 400, 'Please provide both a preview image and the CNC file.');
        }

        const previewFile = req.files.preview[0];
        const cncFile = req.files.cnc[0]; // From memory buffer
        const userId = req.user.id; // From protect middleware

        // Business logic execution
        const newDesign = await designService.createDesign(
            validatedDesign,
            previewFile,
            cncFile,
            userId
        );

        successResponse(res, 201, {
            data: { design: newDesign }
        });
    } catch (error) {
        console.error('Error creating design:', error);
        errorResponse(res, 400, error.message);
    }
};

// Delete a design (Admin only) - Soft delete
exports.deleteDesign = async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 404, 'Design not found');
        }

        const design = await designService.getDesignDocumentById(req.params.id);

        if (!design) {
            return errorResponse(res, 404, 'Design not found');
        }

        // We do a soft delete so users who bought it can still download
        // but it doesn't show up in the main store
        await designService.softDeleteDesign(design);

        successResponse(res, 200, {
            message: 'Design successfully removed from marketplace'
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

// Permanently delete a design and its files (Admin only)
exports.permanentDeleteDesign = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 404, 'Design not found');
        }

        const result = await designService.permanentDeleteDesign(id);

        successResponse(res, 200, result);
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

// Update a design (Admin only)
exports.updateDesign = async (req, res) => {
    try {
        // BUG FIX #5: No ObjectId validation on update endpoint
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 404, 'Design not found');
        }

        const validatedUpdate = validateWithZod(updateDesignSchema, {
            ...(req.body.title !== undefined && { title: xss(req.body.title) }),
            ...(req.body.description !== undefined && { description: xss(req.body.description) }),
            ...(req.body.price !== undefined && { price: req.body.price }),
            ...(req.body.category !== undefined && { category: xss(req.body.category).toLowerCase() }),
        });

        const updatedDesign = await designService.updateDesign(req.params.id, validatedUpdate);

        if (!updatedDesign) {
            return errorResponse(res, 404, 'Design not found');
        }

        successResponse(res, 200, {
            data: { design: updatedDesign }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};
