const Design = require('../models/Design.model');
const { successResponse, errorResponse, serverError } = require('../utils/responseHandler');
const paymentService = require('../services/payment.service');

// Create order for Razorpay UI (Single or Multiple items)
exports.createOrder = async (req, res) => {
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

        // Filter out any free designs just in case they were passed (although free = download directly without razorpay)
        const chargeableDesigns = designs.filter(d => d.price > 0);

        if (chargeableDesigns.length === 0) {
            return errorResponse(res, 400, 'No chargeable designs in request. Use direct download for free designs.');
        }

        const order = await paymentService.createRazorpayOrder(chargeableDesigns, req.user.id);

        successResponse(res, 200, { order });
    } catch (error) {
        // Fix #2: duplicate purchase is a 400 client error, not a 500 server crash
        if (error.message === 'You have already purchased one or more of these designs.') {
            return errorResponse(res, 400, error.message);
        }
        serverError(res, error);
    }
};

// Verify payment signature
exports.verifyPayment = async (req, res) => {
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
        serverError(res, error);
    }
};
