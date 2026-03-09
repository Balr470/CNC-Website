const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'], // Fix #10
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false, // Don't return password by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    purchasedDesigns: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Design',
    }],
    wishlist: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Design',
    }],
    cart: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Design',
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, {
    timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Fix #5: index on resetPasswordToken for fast lookup during password reset
userSchema.index({ resetPasswordToken: 1 });

module.exports = mongoose.model('User', userSchema);
