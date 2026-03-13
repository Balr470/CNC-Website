const mongoose = require('mongoose');
const { Query } = require('node-appwrite');
const User = require('../models/User.model');
const Design = require('../models/Design.model');
const Order = require('../models/Order.model');
const cloudinary = require('../config/cloudinary');
const r2 = require('../config/storage');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { bucketId: appwriteBucketId, configError: appwriteConfigError, isConfigured: isAppwriteConfigured, storage: appwriteStorage } = require('../config/appwrite');

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

    // 5. Appwrite Storage Estimation
    let appwriteStats = {
        status: 'Not Configured',
        bucketId: appwriteBucketId || '',
        bucketName: '',
        totalFiles: 0,
        totalSize: 0,
        maxFileSizeMb: 0,
        fileSecurity: false,
        enabled: false,
    };
    try {
        if (!isAppwriteConfigured) {
            appwriteStats.status = 'Missing Config';
            appwriteStats.error = appwriteConfigError || 'Appwrite env values are missing.';
        } else {
            const bucket = await appwriteStorage.getBucket({ bucketId: appwriteBucketId });
            let totalFiles = 0;
            let totalBytes = 0;
            let offset = 0;
            const pageSize = 100;

            while (true) {
                const filePage = await appwriteStorage.listFiles({
                    bucketId: appwriteBucketId,
                    queries: [Query.limit(pageSize), Query.offset(offset)],
                });

                const files = filePage.files || [];
                totalFiles += files.length;
                totalBytes += files.reduce((sum, file) => sum + (file.sizeOriginal || 0), 0);

                if (files.length < pageSize) {
                    break;
                }

                offset += pageSize;
            }

            appwriteStats = {
                status: 'Active',
                bucketId: bucket.$id,
                bucketName: bucket.name,
                totalFiles,
                totalSize: (totalBytes / 1024 / 1024).toFixed(2),
                maxFileSizeMb: ((bucket.maximumFileSize || 0) / 1024 / 1024).toFixed(2),
                fileSecurity: Boolean(bucket.fileSecurity),
                enabled: Boolean(bucket.enabled),
            };
        }
    } catch (err) {
        appwriteStats = {
            ...appwriteStats,
            status: 'Error',
            error: err.message,
        };
    }

    // 6. Legacy R2 visibility for old deployments only
    let r2Stats = { status: 'Inactive', totalFiles: 0, totalSize: 0 };
    try {
        if (
            process.env.R2_BUCKET_NAME &&
            !String(process.env.R2_BUCKET_NAME).includes('your-production-r2-bucket-name') &&
            !String(process.env.R2_BUCKET_NAME).includes('your-r2-bucket-name')
        ) {
            const command = new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET_NAME
            });
            const response = await r2.send(command);
            if (response.Contents) {
                r2Stats = {
                    status: 'Active',
                    totalFiles: response.Contents.length,
                    totalSize: (response.Contents.reduce((acc, item) => acc + item.Size, 0) / 1024 / 1024).toFixed(2),
                };
            }
        }
    } catch (err) {
        r2Stats = { status: 'Error', error: err.message, totalFiles: 0, totalSize: 0 };
    }

    return {
        counts: { users: totalUsers, designs: totalDesigns },
        revenue: totalRevenue,
        storage: {
            mongodb: dbStats,
            cloudinary: cloudinaryStats,
            appwrite: appwriteStats,
            r2: r2Stats
        }
    };
};

// ─── Get paginated user list (with advanced filters) ────────────────────────
exports.getAllUsers = async ({ page = 1, limit = 20, search = '', role = '', sortBy = 'newest', dateFrom = '', dateTo = '' } = {}) => {
    const query = {};

    // Text search on name or email
    // BUG FIX: Escape regex special chars — unescaped user input like "a.b" or "a*"
    // would be interpreted as a regex pattern and return wrong/unexpected results.
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { name: { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } }
        ];
    }

    // Role filter
    if (role && ['user', 'admin'].includes(role)) {
        query.role = role;
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

    // BUG FIX: Sorting by 'purchases' using { purchasedDesigns: -1 } sorts by
    // the array field value (ObjectId) NOT by the array length. This gives
    // completely random ordering. Must use aggregation with $size to sort by count.
    const needsPurchaseSort = sortBy === 'purchases';
    const sort = needsPurchaseSort ? null : ({
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        name_asc: { name: 1 },
        name_desc: { name: -1 },
    }[sortBy] || { createdAt: -1 });

    let usersQuery;
    if (needsPurchaseSort) {
        usersQuery = User.aggregate([
            { $match: query },
            { $addFields: { purchaseCount: { $size: { $ifNull: ['$purchasedDesigns', []] } } } },
            { $sort: { purchaseCount: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { name: 1, email: 1, role: 1, createdAt: 1, purchasedDesigns: 1 } }
        ]);
    } else {
        usersQuery = User.find(query)
            .select('name email role createdAt purchasedDesigns')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    const [users, total] = await Promise.all([
        usersQuery,
        User.countDocuments(query)
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
};


