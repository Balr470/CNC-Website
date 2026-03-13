const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false, // Never returned in queries by default
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
    stripeCustomerId: String,
    lastAbandonedCartEmailSentAt: Date,
    abandonedCartEmailCount: { type: Number, default: 0 },  // max 3 emails per cart session
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Track when password last changed so old JWTs auto-invalidate
    passwordChangedAt: Date,
}, {
    timestamps: true
});

// ─── Hash password on save ────────────────────────────────────────────────────
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 12);

    // Record the change time so tokens issued before this are rejected.
    // Subtract 1 second as a buffer for the JWT iat clock skew.
    if (!this.isNew) {
        this.passwordChangedAt = new Date(Date.now() - 1000);
    }
});

// ─── Compare password (used in login) ────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// ─── Invalidate tokens issued before a password change ───────────────────────
// Returns true if user changed password AFTER the token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false; // Not changed — token is still valid
};

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ resetPasswordToken: 1 });

module.exports = mongoose.model('User', userSchema);
