const Design = require('../models/Design.model');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const paymentService = require('../services/payment.service');

// Create Razorpay order (Single or Multiple items)
exports.createOrder = async (req, res, next) => {
    try {
        const { designIds } = req.body;

        if (!designIds || !Array.isArray(designIds) || designIds.length === 0) {
            return errorResponse(res, 400, 'An array of designIds is required');
        }

        // Find designs
        const designs = await Design.find({ _id: { $in: designIds } });
        if (designs.length !== designIds.length) {
            return errorResponse(res, 404, 'One or more designs not found');
        }

        // Filter out any free designs
        const chargeableDesigns = designs.filter(d => d.price > 0);

        if (chargeableDesigns.length === 0) {
            return errorResponse(res, 400, 'No chargeable designs in request. Use direct download for free designs.');
        }

        const order = await paymentService.createRazorpayOrder(chargeableDesigns, req.user.id);

        successResponse(res, 200, { order });
    } catch (error) {
        if (error.message === 'You have already purchased one or more of these designs.') {
            return errorResponse(res, 400, error.message);
        }
        next(error);
    }
};

// Verify Razorpay payment signature and fulfil order
exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return errorResponse(res, 400, 'Missing payment verification details');
        }

        const isVerified = await paymentService.verifyAndFulfillPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            req.user.id
        );

        if (isVerified) {
            return successResponse(res, 200, { message: 'Payment verified successfully' });
        } else {
            return errorResponse(res, 400, 'Invalid signature. Payment failed');
        }
    } catch (error) {
        if (error.message && error.message.startsWith('Unauthorized')) {
            return errorResponse(res, 403, error.message);
        }
        next(error);
    }
};
