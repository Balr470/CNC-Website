const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Order = require('../models/Order.model');
const User = require('../models/User.model');

exports.createRazorpayOrder = async (designs, userId) => {
    // Collect IDs
    const designIds = designs.map(d => d._id);

    // Guard: prevent buying designs already purchased
    const alreadyPurchasedCount = await Order.countDocuments({
        userId,
        designIds: { $in: designIds },
        paymentStatus: 'success'
    });

    if (alreadyPurchasedCount > 0) {
        throw new Error('You have already purchased one or more of these designs.');
    }

    // Calculate total amount
    const totalAmount = designs.reduce((sum, design) => sum + design.price, 0);

    const options = {
        amount: totalAmount * 100, // Amount in paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // Save order in DB (pending)
    await Order.create({
        userId: userId,
        designIds: designIds,
        amount: totalAmount,
        orderId: order.id
    });

    return order;
};

exports.verifyAndFulfillPayment = async (orderId, paymentId, signature, userId) => {
    const sign = orderId + "|" + paymentId;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

    if (signature === expectedSign) {
        // Payment Successful
        // Update Order Status
        const order = await Order.findOneAndUpdate(
            { orderId: orderId },
            { paymentStatus: 'success', paymentId: paymentId },
            { new: true }
        );

        if (order) {
            // Add to user purchased library, and clear the cart!
            await User.findByIdAndUpdate(userId, {
                $addToSet: { purchasedDesigns: { $each: order.designIds } },
                $set: { cart: [] } // Clear cart on successful purchase
            });
        }

        return true;
    } else {
        // Payment Failed
        await Order.findOneAndUpdate(
            { orderId: orderId },
            { paymentStatus: 'failed', paymentId: paymentId }
        );
        return false;
    }
};
