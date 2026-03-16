const path = require('path');

const SUPPORTED_DESIGN_FORMATS = new Set([
    'STL',
    'DXF',
    'SVG',
    'OBJ',
    'NC',
    'GCODE',
    'TAP',
    'NGC',
    'CMX',
    'RLF',
    'ART',
    'RAR',
    'RAR4',
    'ZIP',
]);

const getDesignFormatFromFileKey = (fileKey) => {
    if (!fileKey) return 'DXF';
    
    // Decode URL-encoded characters (e.g., %20 -> space)
    const decodedKey = decodeURIComponent(fileKey);
    const extension = path.extname(decodedKey || '').replace('.', '').toUpperCase();

    if (SUPPORTED_DESIGN_FORMATS.has(extension)) {
        return extension;
    }

    return 'DXF';
};

module.exports = {
    getDesignFormatFromFileKey,
};
