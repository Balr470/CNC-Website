const User = require('../models/User.model');
const crypto = require('crypto');

exports.createUser = async (name, email, password) => {
    return await User.create({ name, email, password });
};

exports.authenticateUser = async (email, password) => {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password, user.password))) {
        return null;
    }
    return user;
};

exports.getUserProfile = async (userId) => {
    // Do NOT populate purchasedDesigns — keep as array of ObjectIds
    // to stay consistent with auth.middleware.js which also only returns IDs
    return await User.findById(userId);
};

// Separate function used only for the /my-purchases endpoint
exports.getUserWithPurchases = async (userId) => {
    return await User.findById(userId).populate({
        path: 'purchasedDesigns',
        select: '+fileKey', // Include fileKey so format badge works correctly
        populate: { path: 'uploadedBy', select: 'name' }
    });
};

exports.toggleWishlist = async (userId, designId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const index = user.wishlist.indexOf(designId);
    let isAdded = false;

    if (index === -1) {
        user.wishlist.push(designId);
        isAdded = true;
    } else {
        user.wishlist.splice(index, 1);
    }

    await user.save({ validateBeforeSave: false });
    return { wishlist: user.wishlist, isAdded };
};

exports.getUserWishlist = async (userId) => {
    return await User.findById(userId).populate({
        path: 'wishlist',
        select: '+fileKey',
        match: { isActive: true }, // Only return active designs
        populate: { path: 'uploadedBy', select: 'name' }
    });
};

exports.toggleCart = async (userId, designId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const index = user.cart.indexOf(designId);
    let isAdded = false;

    if (index === -1) {
        user.cart.push(designId);
        isAdded = true;
    } else {
        user.cart.splice(index, 1);
    }

    await user.save({ validateBeforeSave: false });
    return { cart: user.cart, isAdded };
};

exports.getUserCart = async (userId) => {
    return await User.findById(userId).populate({
        path: 'cart',
        select: '+fileKey',
        match: { isActive: true },
        populate: { path: 'uploadedBy', select: 'name' }
    });
};

exports.clearCart = async (userId) => {
    const user = await User.findById(userId);
    user.cart = [];
    await user.save({ validateBeforeSave: false });
    return { cart: [] };
};

exports.createPasswordResetToken = async (email) => {
    const user = await User.findOne({ email });
    if (!user) return null; // We don't throw an error to prevent exact email enumeration

    // Create unique hex token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set it on the user along with expiry
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    return { user, resetToken };
};

exports.resetPassword = async (token, newPassword) => {
    // 1. Get user based on hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() } // Assures token has not expired
    });

    if (!user) {
        throw new Error('Token is invalid or has expired');
    }

    // 2. Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return user;
};
