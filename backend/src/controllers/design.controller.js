const { successResponse, errorResponse } = require('../utils/responseHandler');
const designService = require('../services/design.service');
const xss = require('xss');

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
        const title = xss((req.body.title || '').trim());
        const description = xss((req.body.description || '').trim());
        const category = xss((req.body.category || '').trim());
        const price = req.body.price;

        // Validation logic
        if (!title || !description || price === undefined || !category) {
            return errorResponse(res, 400, 'Please provide a title, description, category, and price.');
        }

        if (isNaN(Number(price)) || Number(price) < 0) {
            return errorResponse(res, 400, 'Price must be a valid positive number.');
        }

        if (!req.files || !req.files.preview || !req.files.cnc) {
            return errorResponse(res, 400, 'Please provide both a preview image and the CNC file.');
        }

        const previewFile = req.files.preview[0];
        const cncFile = req.files.cnc[0]; // From memory buffer
        const userId = req.user.id; // From protect middleware

        // Business logic execution
        const newDesign = await designService.createDesign(
            { title, description, price, category },
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

// Delete a design (Admin only)
exports.deleteDesign = async (req, res) => {
    try {
        const design = await designService.getDesignById(req.params.id);

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

// Update a design (Admin only)
exports.updateDesign = async (req, res) => {
    try {
        const { title, description, price, category } = req.body;

        // BUG FIX #5: No ObjectId validation on update endpoint
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 404, 'Design not found');
        }

        // BUG FIX #5 (cont.): Price validation existed at CREATE but not UPDATE.
        // An admin could set a negative price via PATCH, breaking the cart total.
        if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
            return errorResponse(res, 400, 'Price must be a valid non-negative number.');
        }

        const updatedDesign = await designService.updateDesign(req.params.id, {
            ...(title && { title }),
            ...(description && { description }),
            ...(price !== undefined && { price: Number(price) }),
            ...(category && { category }),
        });

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