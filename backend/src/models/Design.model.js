const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'A design must have a title'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'A design must have a description'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
        type: Number,
        required: [true, 'A design must have a price (0 for free)'],
        min: 0,
    },
    category: {
        type: String,
        required: [true, 'A design must have a category'],
        trim: true,
        default: 'other' // A safe default for existing items
    },
    previewImages: [String],
    fileKey: {
        type: String,
        required: [true, 'R2 key for the file is required'],
        select: false, // Hide real key from default queries
    },
    uploadedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    downloads: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for efficient lookups on the main listing page
designSchema.index({ isActive: 1, category: 1 });
designSchema.index({ isActive: 1, createdAt: -1 });
designSchema.index({ isActive: 1, price: 1 });
// Fix #5: text index for fast full-text search across title and description
designSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Design', designSchema);
