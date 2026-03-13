const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const authService = require('../services/auth.service');
const sendEmail = require('../services/email.service');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    // Remove password from output
    user.password = undefined;

    successResponse(res, statusCode, {
        token,
        data: { user }
    });
};

exports.register = async (req, res) => {
    try {
        const { name, password } = req.body;
        const email = (req.body.email || '').toLowerCase().trim();

        if (!name || !email || !password) {
            return errorResponse(res, 400, 'Please provide name, email, and password');
        }

        // Sanitize name — strip HTML/script and limit characters
        const safeName = name.trim().replace(/<[^>]*>/g, '').substring(0, 100);
        if (!safeName) {
            return errorResponse(res, 400, 'Please provide a valid name');
        }

        // =================================================================
        // Password strength: min 8 chars, 1 uppercase, 1 lowercase, 1 digit
        // =================================================================
        if (password.length < 8) {
            return errorResponse(res, 400, 'Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            return errorResponse(res, 400, 'Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            return errorResponse(res, 400, 'Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            return errorResponse(res, 400, 'Password must contain at least one number');
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 400, 'Please provide a valid email address');
        }

        const newUser = await authService.createUser(safeName, email, password);

        createSendToken(newUser, 201, res);
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 400, 'Email is already registered');
        }
        errorResponse(res, 400, error.message);
    }
};

exports.login = async (req, res) => {
    try {
        const { password } = req.body;
        const email = (req.body.email || '').toLowerCase().trim();

        if (!email || !password) {
            return errorResponse(res, 400, 'Please provide email and password');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 400, 'Please provide a valid email address');
        }

        const user = await authService.authenticateUser(email, password);

        if (!user) {
            // Use same generic message for both "user not found" and "wrong password"
            // to prevent user enumeration attacks
            return errorResponse(res, 401, 'Incorrect email or password');
        }

        createSendToken(user, 200, res);
    } catch (error) {
        errorResponse(res, 401, 'Incorrect email or password');
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.id);
        successResponse(res, 200, {
            data: { user }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return errorResponse(res, 400, 'Please provide your email');

        const result = await authService.createPasswordResetToken(email);

        // Return 200 immediately even if user doesn't exist (security: prevents email enumeration)
        if (!result) {
            return successResponse(res, 200, { message: 'If this email exists in our system, a reset link has been sent.' });
        }

        const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${result.resetToken}`;
        const message = `Forgot your password? Click here to reset it:\n${resetURL}\nIf you didn't forget your password, please ignore this email!`;

        try {
            await sendEmail({
                email: result.user.email,
                subject: 'Your Password Reset Token (Valid for 10 minutes)',
                message
            });
            successResponse(res, 200, { message: 'If this email exists in our system, a reset link has been sent.' });
        } catch (err) {
            result.user.resetPasswordToken = undefined;
            result.user.resetPasswordExpire = undefined;
            await result.user.save({ validateBeforeSave: false });
            return errorResponse(res, 500, 'There was an error sending the email. Try again later.');
        }

    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // BUG FIX #3: This was checking password.length < 6 but registration
        // requires 8 chars. A user could set a 6-char password on reset and
        // then be unable to log in (if register-level server validation rejects).
        // Enforced consistently at 8 characters to match register.
        if (!password || password.length < 8) {
            return errorResponse(res, 400, 'Password must be at least 8 characters long');
        }

        const user = await authService.resetPassword(token, password);
        createSendToken(user, 200, res); // Logs them in automatically
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.getMyPurchases = async (req, res) => {
    try {
        const user = await authService.getUserWithPurchases(req.user.id);
        successResponse(res, 200, {
            data: { designs: user.purchasedDesigns }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.toggleWishlist = async (req, res) => {
    try {
        const { id } = req.params;
        // BUG FIX #4: Invalid ObjectId (e.g. '123abc') causes Mongoose CastError
        // which bubbles to the global error handler with a confusing message.
        // Validate format here for a clean, specific 400 response.
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 400, 'Invalid design ID');
        }

        const isAlreadyInWishlist = req.user.wishlist.some(wId => wId.toString() === id);
        if (!isAlreadyInWishlist && req.user.wishlist.length >= 100) {
            return errorResponse(res, 400, 'Wishlist limit reached. Please remove some items first.');
        }

        const result = await authService.toggleWishlist(req.user.id, id);
        successResponse(res, 200, { data: result });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.getMyWishlist = async (req, res) => {
    try {
        const user = await authService.getUserWishlist(req.user.id);
        successResponse(res, 200, {
            data: { designs: user.wishlist }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.toggleCart = async (req, res) => {
    try {
        const { id } = req.params;
        // BUG FIX #4 (cont.): Same ObjectId validation as toggleWishlist.
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 400, 'Invalid design ID');
        }

        const isAlreadyInCart = req.user.cart.some(cId => cId.toString() === id);
        if (!isAlreadyInCart && req.user.cart.length >= 50) {
            return errorResponse(res, 400, 'Cart limit reached. You can only have 50 items at a time.');
        }

        const result = await authService.toggleCart(req.user.id, id);
        successResponse(res, 200, { data: result });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.getMyCart = async (req, res) => {
    try {
        const user = await authService.getUserCart(req.user.id);
        successResponse(res, 200, {
            data: { designs: user.cart }
        });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

exports.clearCart = async (req, res) => {
    try {
        await authService.clearCart(req.user.id);
        successResponse(res, 200, { message: 'Cart cleared successfully' });
    } catch (error) {
        errorResponse(res, 400, error.message);
    }
};

