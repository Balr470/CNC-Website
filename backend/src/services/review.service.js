const Review = require('../models/Review.model');
const Order = require('../models/Order.model');
const Design = require('../models/Design.model');

// Create a review
exports.createReview = async (userId, designId, rating, comment) => {
    // 1. Check if user has purchased the item (or if it's free, maybe they downloaded it? 
    // Usually only paid orders exist, but let's allow review if they own it.)
    // If it's a free item, anyone can review, OR we strictly only let buyers review paid items. Let's allow if they have an order for it OR the design is free.
    const design = await Design.findById(designId);
    if (!design) throw new Error('Design not found');

    if (design.price > 0) {
        // Check if user has a successful order — match Order model field names (userId, designId, paymentStatus)
        const hasPurchased = await Order.findOne({
            userId,
            designId,
            paymentStatus: 'success'  // ← was incorrectly 'Completed', field was incorrectly 'status'
        });
        if (!hasPurchased) {
            throw new Error('You must purchase this design before leaving a review.');
        }
    }

    // 2. Check for duplicate review before hitting the DB unique index
    const existingReview = await Review.findOne({ user: userId, design: designId });
    if (existingReview) {
        throw Object.assign(new Error('You have already reviewed this design.'), { code: 11000 });
    }

    // 3. Create the review
    const review = await Review.create({
        user: userId,
        design: designId,
        rating,
        comment
    });

    return review;
};

// Get paginated reviews for a specific design
exports.getDesignReviews = async (designId, { page = 1, limit = 10 } = {}) => {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
        Review.find({ design: designId })
            .populate('user', 'name')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit),
        Review.countDocuments({ design: designId })
    ]);
    return { reviews, total, page, pages: Math.ceil(total / limit) };
};
