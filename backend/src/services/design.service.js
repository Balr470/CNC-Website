const Design = require('../models/Design.model');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

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
        .populate('uploadedBy', 'name')
        .select('+fileKey')  // Include fileKey so frontend can show correct format badge
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    return { designs, total, page: pageNum, pages: Math.ceil(total / limitNum) };
};

// Get a single design by ID with populated user info
exports.getDesignById = async (id) => {
    return await Design.findById(id).populate('uploadedBy', 'name');
};

// Create a new design: Watermark preview, upload CNC file, and save record
exports.createDesign = async (designData, previewFile, cncFile, userId) => {
    // Fix #2: safely get the Cloudinary public_id — filename is set by multer-storage-cloudinary
    const publicId = previewFile.filename || previewFile.public_id;
    if (!publicId) throw new Error('Preview image upload failed — no public_id returned from Cloudinary');

    const watermarkedUrl = cloudinary.url(publicId, {
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

    // Upload main file to Cloudinary
    const fileKey = await uploadToCloudinary(
        cncFile.buffer,
        cncFile.mimetype,
        cncFile.originalname
    );

    // Save to database
    return await Design.create({
        title: designData.title,
        description: designData.description,
        price: Number(designData.price),
        category: designData.category || 'other',
        previewImages: [watermarkedUrl],
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

// Get related designs by category
exports.getRelatedDesigns = async (designId, category, limit = 4) => {
    return await Design.find({
        category: category,
        _id: { $ne: designId },
        isActive: true
    })
        .populate('uploadedBy', 'name')
        .select('+fileKey -__v')
        .limit(limit);
};
