const SUPPORTED_DESIGN_FORMATS = new Set([
    'STL', 'DST', 'DXF', 'SVG', 'OBJ', 'NC', 'GCODE', 
    'TAP', 'NGC', 'CMX', 'RLF', 'ART', 'RAR', 'RAR4', 'ZIP',
]);

const getDesignFormat = (design) => {
    console.log('getDesignFormat called with:', design?.format, design?.fileKey);
    
    if (design?.format) {
        const normalizedFormat = String(design.format).toUpperCase();
        console.log('Using format from design.format:', normalizedFormat);
        return SUPPORTED_DESIGN_FORMATS.has(normalizedFormat) ? normalizedFormat : 'DXF';
    }

    if (!design?.fileKey) {
        console.log('No fileKey, returning DXF');
        return 'DXF';
    }

    const ext = design.fileKey.split('.').pop().toUpperCase();
    console.log('Extracted from fileKey:', ext);
    return SUPPORTED_DESIGN_FORMATS.has(ext) ? ext : 'DXF';
};

export default getDesignFormat;
