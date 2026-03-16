const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envName = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(process.cwd(), `.env.${envName}`);

if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
} else {
    dotenv.config();
}

const mongoose = require('mongoose');

const Design = require('../models/Design.model');

const SUPPORTED_DESIGN_FORMATS = new Set([
    'STL', 'DXF', 'SVG', 'OBJ', 'NC', 'GCODE', 'TAP', 
    'NGC', 'CMX', 'RLF', 'ART', 'RAR', 'RAR4', 'ZIP'
]);

const getFormatFromFileKey = (fileKey) => {
    if (!fileKey) return 'DXF';
    const ext = path.extname(fileKey || '').replace('.', '').toUpperCase();
    return SUPPORTED_DESIGN_FORMATS.has(ext) ? ext : 'DXF';
};

async function fixDesignFormats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const designs = await Design.find({}).select('+fileKey');
        console.log(`Found ${designs.length} designs`);

        let updated = 0;
        for (const design of designs) {
            const fileKey = design.fileKey;
            const correctFormat = getFormatFromFileKey(fileKey);
            
            // Force update all designs based on fileKey
            design.format = correctFormat;
            await design.save();
            updated++;
            console.log(`Updated design "${design.title}" - old format: ${design.format}, new format: ${correctFormat}, fileKey: ${fileKey}`);
        }

        console.log(`\nTotal updated: ${updated}/${designs.length}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

fixDesignFormats();
