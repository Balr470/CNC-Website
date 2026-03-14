const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Order = require('../models/Order.model');
const User = require('../models/User.model');

exports.createRazorpayOrder = async (designs, userId) => {
    const ownedDesignIds = designs
        .filter((design) => design.uploadedBy?.toString() === userId.toString())
        .map((design) => design._id.toString());

    if (ownedDesignIds.length > 0) {
        throw new Error('You cannot purchase your own design.');
    }

    const designIds = designs.map((design) => design._id);

    const alreadyPurchasedCount = await Order.countDocuments({
        userId,
        designIds: { $in: designIds },
        paymentStatus: 'success'
    });

    if (alreadyPurchasedCount > 0) {
        throw new Error('You have already purchased one or more of these designs.');
    }

    const totalAmount = designs.reduce((sum, design) => sum + design.price, 0);

    const order = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
    });

    await Order.create({
        userId,
        designIds,
        amount: totalAmount,
        orderId: order.id
    });

    return order;
};

const fulfillOrder = async (order, paymentId) => {
    if (order.paymentStatus === 'success') {
        return true;
    }

    order.paymentStatus = 'success';
    order.paymentId = paymentId;
    await order.save();

    await User.findByIdAndUpdate(order.userId, {
        $addToSet: { purchasedDesigns: { $each: order.designIds } },
        $pull: { cart: { $in: order.designIds } }
    });

    return true;
};

exports.verifyAndFulfillPayment = async (orderId, paymentId, signature, userId) => {
    const sign = `${orderId}|${paymentId}`;
    const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

    if (signature !== expectedSign) {
        await Order.findOneAndUpdate(
            { orderId },
            { paymentStatus: 'failed', paymentId }
        );
        return false;
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
        throw new Error('Unauthorized: Order not found.');
    }

    if (order.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized: This order does not belong to you.');
    }

    return fulfillOrder(order, paymentId);
};

exports.verifyWebhookSignature = (payloadBuffer, signature) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        throw new Error('Razorpay webhook secret is not configured.');
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payloadBuffer)
        .digest('hex');

    return expectedSignature === signature;
};

exports.handlePaymentCapturedWebhook = async (payload) => {
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId || !paymentId) {
        throw new Error('Invalid Razorpay webhook payload.');
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
        return false;
    }

    return fulfillOrder(order, paymentId);
};
