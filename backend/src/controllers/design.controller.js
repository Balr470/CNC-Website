const { successResponse, errorResponse } = require('../utils/responseHandler');
const designService = require('../services/design.service');

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

// Create a design (Handled by multer upload preview and uploadCNC middlewares)
exports.createDesign = async (req, res) => {
    try {
        const { title, description, price, category } = req.body;

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