const bundleService = require('../services/bundle.service');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.getAllBundles = async (req, res, next) => {
    try {
        const bundles = await bundleService.getAllBundles();
        successResponse(res, 200, { bundles });
    } catch (error) {
        next(error);
    }
};

exports.getBundle = async (req, res, next) => {
    try {
        const bundle = await bundleService.getBundleById(req.params.id);
        if (!bundle) return errorResponse(res, 404, 'Bundle not found');
        successResponse(res, 200, { bundle });
    } catch (error) {
        next(error);
    }
};

exports.createBundle = async (req, res, next) => {
    try {
        const { title, description, price, designs, previewImage } = req.body;

        // Validation at controller level (user rule)
        if (!title || !description || price === undefined || !designs || !previewImage) {
            return errorResponse(res, 400, 'Please provide title, description, price, designs, and previewImage.');
        }

        if (!Array.isArray(designs) || designs.length === 0) {
            return errorResponse(res, 400, 'Designs must be a non-empty array of design IDs.');
        }

        const invalidId = designs.find(id => !id.match(/^[0-9a-fA-F]{24}$/));
        if (invalidId) {
            return errorResponse(res, 400, `Invalid Design ID: ${invalidId}`);
        }

        if (isNaN(Number(price)) || Number(price) < 0) {
            return errorResponse(res, 400, 'Price must be a valid non-negative number.');
        }

        const bundle = await bundleService.createBundle({ title, description, price: Number(price), designs, previewImage });
        successResponse(res, 201, { bundle });
    } catch (error) {
        next(error);
    }
};
