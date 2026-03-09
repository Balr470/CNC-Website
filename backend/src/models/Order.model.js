const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    designIds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Design',
        required: true,
    }],
    amount: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending',
    },
    paymentId: {
        type: String, // from razorpay
    },
    orderId: {
        type: String, // razorpay order id
        required: true,
    }
}, {
    timestamps: true
});

// Fix #4: Index orderId for fast payment verification lookups
orderSchema.index({ orderId: 1 });
// Compound index for duplicate purchase guard query
// Note: indexing arrays like designIds can be heavy, but it's ok for small cart sizes
orderSchema.index({ userId: 1, designIds: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
