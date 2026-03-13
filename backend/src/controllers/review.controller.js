const reviewService = require('../services/review.service');
const { successResponse, errorResponse } = require('../utils/responseHandler');

exports.createReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { designId } = req.params;
        const userId = req.user.id; // from auth middleware

        if (!rating || !comment) {
            return errorResponse(res, 400, 'Please provide both a rating and a comment.');
        }

        if (!designId || !designId.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 400, 'Invalid Design ID format');
        }

        const review = await reviewService.createReview(userId, designId, rating, comment);
        return successResponse(res, 201, { message: 'Review created successfully', data: { review } });

    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 400, 'You have already reviewed this design.');
        }
        return errorResponse(res, 400, error.message);
    }
};

exports.getDesignReviews = async (req, res) => {
    try {
        const { designId } = req.params;

        if (!designId || !designId.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 400, 'Invalid Design ID format');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await reviewService.getDesignReviews(designId, { page, limit });

        let avgRating = 0;
        if (result.total > 0) {
            const allReviews = await reviewService.getDesignReviews(designId, { page: 1, limit: result.total });
            const sum = allReviews.reviews.reduce((acc, r) => acc + r.rating, 0);
            avgRating = (sum / result.total).toFixed(1);
        }

        return successResponse(res, 200, {
            data: {
                reviews: result.reviews,
                avgRating,
                total: result.total,
                page: result.page,
                pages: result.pages
            }
        });
    } catch (error) {
        return errorResponse(res, 400, error.message);
    }
};
