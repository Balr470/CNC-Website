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

const getDesignFormat = (design) => {
    if (design?.format) {
        const normalizedFormat = String(design.format).toUpperCase();
        return SUPPORTED_DESIGN_FORMATS.has(normalizedFormat) ? normalizedFormat : 'DXF';
    }

    if (!design?.fileKey) {
        return 'DXF';
    }

    const ext = design.fileKey.split('.').pop().toUpperCase();
    return SUPPORTED_DESIGN_FORMATS.has(ext) ? ext : 'DXF';
};

export default getDesignFormat;
