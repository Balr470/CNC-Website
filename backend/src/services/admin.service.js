const mongoose = require('mongoose');
const User = require('../models/User.model');
const Design = require('../models/Design.model');
const Order = require('../models/Order.model');
const cloudinary = require('../config/cloudinary');
const r2 = require('../config/storage');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

exports.getDashboardStats = async () => {
    // 1. Basic Counts
    const totalUsers = await User.countDocuments();
    // Fix #8: only count active (non-deleted) designs
    const totalDesigns = await Design.countDocuments({ isActive: true });

    // Fix #3: use aggregate sum instead of loading all orders into memory
    const revenueResult = await Order.aggregate([
        { $match: { paymentStatus: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // 3. MongoDB Storage Stats
    let dbStats = { dataSize: 0, storageSize: 0, totalLimit: '512' };
    try {
        if (mongoose.connection.db) {
            const stats = await mongoose.connection.db.command({ dbStats: 1 });
            dbStats.dataSize = (stats.dataSize / 1024 / 1024).toFixed(2);
            dbStats.storageSize = (stats.storageSize / 1024 / 1024).toFixed(2);
        }
    } catch (err) {
        dbStats.error = "Failed to fetch Mongo stats";
    }

    // 4. Cloudinary Usage
    let cloudinaryStats = { status: 'Not Configured', bandwidth: 0, storage: 0, credits: 0 };
    try {
        if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key_goes_here') {
            const usage = await cloudinary.api.usage();
            cloudinaryStats = {
                status: 'Active',
                plan: usage.plan,
                bandwidth: (usage.bandwidth.usage / 1024 / 1024).toFixed(2),
                storage: (usage.storage.usage / 1024 / 1024).toFixed(2),
                credits: usage.credits.usage
            };
        } else {
            cloudinaryStats.status = 'Missing API Key';
        }
    } catch (err) {
        cloudinaryStats = { status: 'Error', error: err.message };
    }

    // 5. R2 Storage Estimation
    let r2Stats = { status: 'Active', totalFiles: 0, totalSize: 0 };
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME
        });
        const response = await r2.send(command);
        if (response.Contents) {
            r2Stats.totalFiles = response.Contents.length;
            const totalBytes = response.Contents.reduce((acc, item) => acc + item.Size, 0);
            r2Stats.totalSize = (totalBytes / 1024 / 1024).toFixed(2); // MB
        }
    } catch (err) {
        r2Stats = { status: 'Error', error: err.message };
    }

    return {
        counts: { users: totalUsers, designs: totalDesigns },
        revenue: totalRevenue,
        storage: {
            mongodb: dbStats,
            cloudinary: cloudinaryStats,
            r2: r2Stats
        }
    };
};

// ─── Get paginated user list (with advanced filters) ────────────────────────
exports.getAllUsers = async ({ page = 1, limit = 20, search = '', role = '', subscription = '', sortBy = 'newest', dateFrom = '', dateTo = '' } = {}) => {
    const query = {};

    // Text search on name or email
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    // Role filter
    if (role && ['user', 'admin'].includes(role)) {
        query.role = role;
    }

    // Subscription status filter
    if (subscription === 'active') {
        query.subscriptionStatus = 'active';
    } else if (subscription === 'none') {
        query.subscriptionStatus = { $ne: 'active' };
    }

    // Date range filter on createdAt
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    // Sort mapping
    const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        purchases: { purchasedDesigns: -1 },
        name_asc: { name: 1 },
        name_desc: { name: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    const [users, total] = await Promise.all([
        User.find(query)
            .select('name email role createdAt purchasedDesigns subscriptionStatus downloadsRemaining')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments(query)
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
};


// ─── Promote / demote user role ───────────────────────────────────────────────
exports.setUserRole = async (userId, role) => {
    if (!['user', 'admin'].includes(role)) throw new Error('Invalid role');
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true })
        .select('name email role');
    if (!user) throw new Error('User not found');
    return user;
};

