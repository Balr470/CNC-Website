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
]);

const getDesignFormatFromFileKey = (fileKey) => {
    const extension = path.extname(fileKey || '').replace('.', '').toUpperCase();

    if (SUPPORTED_DESIGN_FORMATS.has(extension)) {
        return extension;
    }

    return 'DXF';
};

module.exports = {
    getDesignFormatFromFileKey,
};
