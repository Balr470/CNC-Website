const Design = require('../models/Design.model');
const Review = require('../models/Review.model');
const cloudinary = require('../config/cloudinary');
const uploadToAppwrite = require('../utils/uploadToAppwrite');
const uploadToR2 = require('../utils/uploadToR2');
const { deleteDesignFiles } = require('../utils/deleteStorageFiles');

const LARGE_FILE_THRESHOLD = 25 * 1024 * 1024; // 25MB

// Serialize design to remove sensitive fields
const serializeDesign = (design) => {
    const obj = design.toObject();
    delete obj.fileKey;
    return obj;
};

// Get all active designs with populated user info, optionally filtered by category/search/sort/page
exports.getAllDesigns = async ({ category, search, sort, page, limit, priceType, fileType } = {}) => {
    const filter = { isActive: true };

    if (category) {
        // BUG FIX #4: `new RegExp('^category$', 'i')` is correct for exact match but
        // the original code was: new RegExp(`^${category}$`, 'i') which is fine for
        // exact slug match. However the value isn't escaped, so a crafted category
        // slug like '3d.*' would match everything. Fix: use strict string equality.
        filter.category = category.toLowerCase();
    }
    if (search) {
        // BUG FIX #5: Same unescaped regex injection as admin service.
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { title: { $regex: escaped, $options: 'i' } },
            { description: { $regex: escaped, $options: 'i' } }
        ];
    }
    if (priceType === 'free') {
        filter.price = 0;
    } else if (priceType === 'premium') {
        filter.price = { $gt: 0 };
    }
    if (fileType) {
        const escapedFileType = fileType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.fileKey = new RegExp(`\\.${escapedFileType}$`, 'i');
    }

    // Sorting
    let sortOption = '-createdAt'; // Default: newest
    if (sort === 'price_asc') sortOption = 'price';
    else if (sort === 'price_desc') sortOption = '-price';
    else if (sort === 'popular') sortOption = '-downloads';

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Design.countDocuments(filter);
    const designs = await Design.find(filter)
        .populate('uploadedBy', 'name sellerTier totalSales averageRating')
        .select('+fileKey')  // Include fileKey so frontend can show correct format badge
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    // Get review stats for each design
    const designIds = designs.map(d => d._id);
    const reviewStats = await Review.aggregate([
        { $match: { design: { $in: designIds } } },
        { $group: { 
            _id: '$design', 
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
        }}
    ]);

    const statsMap = Object.fromEntries(
        reviewStats.map(r => [r._id.toString(), { avgRating: r.avgRating, count: r.count }])
    );

    // Attach review stats to designs
    const designsWithReviews = designs.map(design => {
        const stats = statsMap[design._id.toString()] || { avgRating: 0, count: 0 };
        return {
            ...serializeDesign(design),
            avgRating: stats.avgRating,
            reviewCount: stats.count
        };
    });

    return { designs: designsWithReviews, total, page: pageNum, pages: Math.ceil(total / limitNum) };
};

// Get a single design by ID with populated user info
exports.getDesignById = async (id) => {
    const design = await Design.findById(id)
        .select('+fileKey')
        .populate('uploadedBy', 'name sellerTier totalSales averageRating');
    
    if (!design) return null;

    // Get review stats
    const reviewStats = await Review.aggregate([
        { $match: { design: design._id } },
        { $group: { 
            _id: null, 
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
        }}
    ]);

    const stats = reviewStats[0] || { avgRating: 0, count: 0 };

    // Serialize the design (remove fileKey)
    const serialized = serializeDesign(design);

    return {
        ...serialized,
        avgRating: stats.avgRating,
        reviewCount: stats.count
    };
};

exports.getDesignDocumentById = async (id) => {
    return await Design.findById(id);
};

// Create a new design: watermark the Cloudinary preview and store the CNC source file in Appwrite private storage.
exports.createDesign = async (designData, mainImageFile, additionalImageFiles, cncFile, userId) => {
    // Watermark main image
    const mainPublicId = mainImageFile.filename || mainImageFile.public_id;
    if (!mainPublicId) throw new Error('Main image upload failed — no public_id returned from Cloudinary');

    const watermarkedMainUrl = cloudinary.url(mainPublicId, {
        secure: true,
        transformation: [
            { width: 800, crop: "scale" },
            {
                overlay: {
                    font_family: "Arial",
                    font_size: 40,
                    text: "CNC-MARKETPLACE"
                },
                gravity: "south",
                y: 20,
                color: "white",
                opacity: 50
            }
        ]
    });

    // Watermark additional images
    const watermarkedAdditionalUrls = await Promise.all(
        (additionalImageFiles || []).map(async (imgFile) => {
            const publicId = imgFile.filename || imgFile.public_id;
            if (!publicId) return null;

            return cloudinary.url(publicId, {
                secure: true,
                transformation: [
                    { width: 800, crop: "scale" },
                    {
                        overlay: {
                            font_family: "Arial",
                            font_size: 40,
                            text: "CNC-MARKETPLACE"
                        },
                        gravity: "south",
                        y: 20,
                        color: "white",
                        opacity: 50
                    }
                ]
            });
        })
    );

    // Filter out null values and combine all preview images
    const allPreviewImages = [
        watermarkedMainUrl,
        ...watermarkedAdditionalUrls.filter(url => url !== null)
    ];

    // Upload the protected source file to storage (R2 for files > 25MB, Appwrite for smaller files)
    const fileSize = cncFile.buffer.length;
    let fileKey;
    
    if (fileSize > LARGE_FILE_THRESHOLD) {
        // Use R2 for large files (>25MB)
        fileKey = await uploadToR2(
            cncFile.buffer,
            cncFile.mimetype,
            cncFile.originalname
        );
    } else {
        // Use Appwrite for smaller files
        fileKey = await uploadToAppwrite(
            cncFile.buffer,
            cncFile.mimetype,
            cncFile.originalname
        );
    }

    // Save to database
    return await Design.create({
        title: designData.title,
        description: designData.description,
        price: Number(designData.price),
        category: designData.category || 'other',
        previewImages: allPreviewImages,
        fileKey,
        uploadedBy: userId
    });
};

// Update a design
exports.updateDesign = async (id, updateData) => {
    return await Design.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

// Soft delete a design
exports.softDeleteDesign = async (design) => {
    design.isActive = false;
    await design.save();

    // HIGHLY OPTIMIZED FIX: Only target users who actually have this design 
    // in their cart or wishlist. This prevents scanning the entire User collection.
    const User = require('../models/User.model');
    await User.updateMany(
        { $or: [{ cart: design._id }, { wishlist: design._id }] }, 
        { $pull: { cart: design._id, wishlist: design._id } }
    );

    return design;
};

// Hard delete - permanently removes design and files from storage
exports.permanentDeleteDesign = async (designId) => {
    console.log('\n========== PERMANENT DELETE ==========');
    console.log('[PERMANENT DELETE] Design ID:', designId);
    
    const design = await Design.findById(designId).select('+fileKey');
    
    if (!design) {
        console.log('[PERMANENT DELETE] Design not found!');
        throw new Error('Design not found');
    }

    console.log('[PERMANENT DELETE] Design found');
    console.log('[PERMANENT DELETE] fileKey:', design.fileKey);
    console.log('[PERMANENT DELETE] previewImages:', design.previewImages);

    // Delete files from storage
    const deletionResults = await deleteDesignFiles(design);
    console.log('[PERMANENT DELETE] Deletion results:', deletionResults);

    // Remove from users' purchased designs, cart, and wishlist
    const User = require('../models/User.model');
    await User.updateMany(
        { $or: [
            { purchasedDesigns: design._id },
            { cart: design._id },
            { wishlist: design._id }
        ]},
        { 
            $pull: { 
                purchasedDesigns: design._id,
                cart: design._id,
                wishlist: design._id 
            } 
        }
    );

    // Delete the design from database
    await Design.findByIdAndDelete(designId);

    return {
        message: 'Design permanently deleted',
        deletionResults
    };
};

// Get related designs by category
exports.getRelatedDesigns = async (designId, category, limit = 4) => {
    const relatedDesigns = await Design.find({
        category: category,
        _id: { $ne: designId },
        isActive: true
    })
        .populate('uploadedBy', 'name')
        .select('+fileKey -__v')
        .limit(limit);

    return relatedDesigns.map(serializeDesign);
};
