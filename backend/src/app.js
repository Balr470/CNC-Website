const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const compression = require('compression');
const logger = require('./config/logger');

const xssSanitizer = require('./middlewares/sanitize.middleware');
const { limiter } = require('./middlewares/rateLimit.middleware');

// Routes
const authRouter = require('./routes/auth.routes');
const designRouter = require('./routes/design.routes');
const paymentRouter = require('./routes/payment.routes');
const downloadRouter = require('./routes/download.routes');
const adminRouter = require('./routes/admin.routes');
const reviewRouter = require('./routes/review.routes');
const bundleRouter = require('./routes/bundle.routes');

const app = express();

// Trust reverse proxy (Vercel/Render) so rate limiters get correct IP
app.set('trust proxy', 1);

// ─── 0. Response Compression ─────────────────────────────────────────
// Gzip/Brotli compress all responses > 1kb — reduces bandwidth ~60-80%
app.use(compression({
    level: 6,       // balance: good compression without too much CPU
    threshold: 1024 // only compress if response body is > 1kb
}));

// ─── 0. Static uploads (local dev fallback) ──────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── 1. CORS ─────────────────────────────────────────────────────────────────
// Must be FIRST — even rate-limited / blocked requests need CORS headers
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://www.cncmarket.in', // production www
    'https://cncmarket.in',     // production non-www
    'http://localhost:5173',
    'http://localhost:5174', // Vite fallback
].filter(Boolean); // remove undefined if FRONTEND_URL not set

app.use(cors({
    origin: function (origin, callback) {
        // No origin → server-to-server / mobile / curl (allow)
        if (!origin) return callback(null, true);
        // Explicit allow-list or any Vercel preview domain
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: this origin is not allowed.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── 2. Security HTTP headers (Helmet) ───────────────────────────────────────
app.use(helmet({
    // Allow cross-origin image loading (Cloudinary previews)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Content-Security-Policy: lock down what can run in the browser
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
            connectSrc: ["'self'", process.env.FRONTEND_URL, 'https://*.vercel.app'].filter(Boolean),
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    // Don't expose server info
    hidePoweredBy: true,
    // HSTS: tell browsers to always use HTTPS
    strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
    },
}));

// ─── 3. Request logging ───────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    // In production: pipe Morgan through Winston so HTTP logs land in combined.log
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) }
    }));
}

// ─── 4. Global rate limiter (100 req / 15 min / IP) ─────────────────────────
app.use('/api', limiter);

// ─── 5. Body parser (tight limit) ────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── 6. NoSQL injection sanitizer ────────────────────────────────────────────
// Strips $-prefixed MongoDB operators from req.body, req.params, req.query
app.use((req, res, next) => {
    ['body', 'query', 'params'].forEach(key => {
        if (req[key] && typeof req[key] === 'object') {
            for (const prop of Object.keys(req[key])) {
                req[key][prop] = mongoSanitize.sanitize(req[key][prop], {
                    replaceWith: '_'
                });
            }
        }
    });
    next();
});

// ─── 7. XSS sanitizer ────────────────────────────────────────────────────────
// Strips HTML/script tags from all string fields in req.body, req.query, req.params
app.use(xssSanitizer);

// ─── 8. HTTP Parameter Pollution prevention ───────────────────────────────────
// Prevents attackers from duplicating query params (e.g. ?sort=asc&sort=desc)
app.use(hpp({
    whitelist: ['sort', 'category', 'fileType', 'priceType', 'limit', 'page'],
}));

// ─── Health Check & Keep-Alive ────────────────────────────────────────────────
app.get('/', (req, res) => res.status(200).json({ status: 'live', message: 'CNC Backend is running' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'live' }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/designs', designRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/downloads', downloadRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bundles', bundleRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.all('/{*path}', (req, res) => {
    res.status(404).json({ error: `Can't find ${req.originalUrl} on this server!` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Multer file size exceeded
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File is too large. Max allowed size is 50MB.';
    }

    // Mongoose Bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}.`;
    }

    // Mongoose Duplicate Key
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const value = err.keyValue?.[field];
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" is already in use.`;
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors).map(el => el.message);
        message = `Invalid input data. ${errors.join('. ')}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your session has expired. Please log in again.';
    }

    // CORS errors
    if (err.message && err.message.includes('CORS policy')) {
        statusCode = 403;
        message = err.message;
    }

    // Only log true server errors (not expected 4xx client errors)
    if (statusCode >= 500) {
        logger.error({
            message: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
            statusCode,
        });
    }

    res.status(statusCode).json({ error: message });
});

module.exports = app;
