const xss = require('xss');

/**
 * Recursively sanitize all string values in an object against XSS attacks.
 * Strips HTML tags and dangerous attributes from any user input.
 */
const sanitizeObject = (obj) => {
    if (typeof obj === 'string') return xss(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }
    return obj;
};

/**
 * Express middleware: sanitize req.body, req.query, and req.params
 * against XSS injection. Runs after body-parser.
 */
const xssSanitizer = (req, res, next) => {
    ['body', 'query', 'params'].forEach(key => {
        if (req[key] && typeof req[key] === 'object') {
            for (const prop of Object.keys(req[key])) {
                req[key][prop] = sanitizeObject(req[key][prop]);
            }
        }
    });
    next();
};

module.exports = xssSanitizer;
