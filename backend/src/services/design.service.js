const Design = require('../models/Design.model');
const cloudinary = require('../config/cloudinary');
const uploadToR2 = require('../utils/uploadToR2');

// Get all active designs with populated user info, optionally filtered by category/search/sort/page
exports.getAllDesigns = async ({ category, search, sort, page, limit, priceType, fileType } = {}) => {
    const filter = { isActive: true };

    if (category) {
        filter.category = new RegExp(`^${category}$`, 'i');
    }
    if (search) {
        // Search both title and description for better results
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    if (priceType === 'free') {
        filter.price = 0;
    } else if (priceType === 'premium') {
        filter.price = { $gt: 0 };
    }
    if (fileType) {
        filter.fileKey = new RegExp(`\\.${fileType}$`, 'i');
    }

    // Sorting
    let sortOption = '-createdAt'; // Default: newest
    if (sort === 'price_asc') sortOption = 'price';
    else if (sort === 'price_desc') sortOption = '-price';

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

    // Upload main file to R2
    const fileKey = await uploadToR2(
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
    return design;
};
