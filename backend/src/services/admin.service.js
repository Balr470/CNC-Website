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
    ]) || [];
    const totalRevenue = revenueResult[0]?.total || 0;

    // 3. MongoDB Storage Stats
    let dbStats = { dataSize: 0, storageSize: 0, totalLimit: '512', limitType: 'Free M0 Cluster' };
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
    let cloudinaryStats = { status: 'Not Configured', bandwidth: 0, storage: 0, credits: 0, storageLimit: '25 GB' };
    try {
        const config = cloudinary.config();
        const apiKey = config.api_key;
        const apiSecret = config.api_secret;
        const cloudName = config.cloud_name;

        const isMissing = (val) => !val || String(val).startsWith('your_') || String(val).includes('_here');

        if (!isMissing(apiKey) && !isMissing(apiSecret) && !isMissing(cloudName)) {
            const usage = await cloudinary.api.usage();
            cloudinaryStats = {
                status: 'Active',
                plan: usage.plan,
                planLimit: '25 GB',
                bandwidth: (usage.bandwidth.usage / 1024 / 1024).toFixed(2),
                storage: (usage.storage.usage / 1024 / 1024).toFixed(2),
                storageLimit: '25 GB',
                credits: usage.credits.usage
            };
        } else {
            cloudinaryStats.status = 'Missing Config';
            cloudinaryStats.error = !apiKey ? 'API Key missing' : (!apiSecret ? 'API Secret missing' : 'Cloud Name missing');
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
                storageLimit: '10 GB',
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

    // 6. Cloudflare R2 Storage (for large files >25MB)
    let r2Stats = { status: 'Inactive', totalFiles: 0, totalSize: 0, bucketName: '', endpoint: '' };
    try {
        if (
            process.env.R2_BUCKET_NAME &&
            process.env.R2_ENDPOINT &&
            process.env.R2_ACCESS_KEY &&
            !String(process.env.R2_BUCKET_NAME).includes('your-')
        ) {
            const command = new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET_NAME
            });
            const response = await r2.send(command);
            
            const files = response.Contents || [];
            const totalBytes = files.reduce((acc, item) => acc + item.Size, 0);
            
            r2Stats = {
                status: 'Active',
                totalFiles: files.length,
                totalSize: (totalBytes / 1024 / 1024).toFixed(2),
                bucketName: process.env.R2_BUCKET_NAME,
                endpoint: process.env.R2_ENDPOINT,
                storageLimit: '10 GB',
                isPrimary: true,
                largeFileThreshold: '25MB',
                usage: files.length > 0 ? 'Primary storage for large files' : 'Ready for large file uploads'
            };
        }
    } catch (err) {
        r2Stats = { 
            status: 'Error', 
            error: err.message, 
            totalFiles: 0, 
            totalSize: 0,
            bucketName: process.env.R2_BUCKET_NAME || '',
            endpoint: process.env.R2_ENDPOINT || ''
        };
    }

    // 7. Get order/payment stats
    const orderStats = await Order.aggregate([
        { $match: { paymentStatus: 'success' } },
        { $group: { 
            _id: null, 
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            avgOrderValue: { $avg: '$amount' }
        }}
    ]);

    // 8. Get design stats by category
    const categoryStats = await Design.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    // 9. Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentStats = await Promise.all([
        User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Design.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Order.countDocuments({ createdAt: { $gte: sevenDaysAgo }, paymentStatus: 'success' })
    ]);

    return {
        counts: { 
            users: totalUsers, 
            designs: totalDesigns,
            newUsers: recentStats[0],
            newDesigns: recentStats[1],
            recentOrders: recentStats[2]
        },
        revenue: totalRevenue,
        orders: {
            total: orderStats[0]?.totalOrders || 0,
            avgValue: orderStats[0]?.avgOrderValue?.toFixed(2) || 0
        },
        categories: categoryStats.map(c => ({ name: c._id, count: c.count })),
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

// ─── Update seller tier ───────────────────────────────────────────────────────
exports.updateSellerTier = async (userId, tier) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
    }

    const validTiers = ['none', 'verified', 'pro', 'topSeller'];
    if (!validTiers.includes(tier)) {
        throw new Error('Invalid seller tier. Must be one of: ' + validTiers.join(', '));
    }

    const updateData = { sellerTier: tier };
    
    if (tier !== 'none' && tier !== 'verified') {
        updateData.sellerVerifiedAt = new Date();
    }

    const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
    ).select('name email sellerTier sellerVerifiedAt');

    if (!user) {
        throw new Error('User not found');
    }

    return user;
};

// ─── Get seller stats ─────────────────────────────────────────────────────────
exports.getSellerStats = async (sellerId) => {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
        throw new Error('Invalid seller ID');
    }

    const seller = await User.findById(sellerId)
        .select('name sellerTier totalSales totalRatings averageRating isProfileComplete sellerDescription sellerLocation sellerVerifiedAt');

    if (!seller) {
        throw new Error('Seller not found');
    }

    const designCount = await Design.countDocuments({ uploadedBy: sellerId, isActive: true });
    
    const salesData = await Order.aggregate([
        { $match: { paymentStatus: 'success' } },
        { $unwind: '$designIds' },
        { $lookup: {
            from: 'designs',
            localField: 'designIds',
            foreignField: '_id',
            as: 'design'
        }},
        { $unwind: '$design' },
        { $match: { 'design.uploadedBy': new mongoose.Types.ObjectId(sellerId) } },
        { $group: { 
            _id: null, 
            totalRevenue: { $sum: '$design.price' },
            orderCount: { $sum: 1 }
        }}
    ]);

    return {
        seller,
        designCount,
        totalRevenue: salesData[0]?.totalRevenue || 0,
        orderCount: salesData[0]?.orderCount || 0
    };
};


