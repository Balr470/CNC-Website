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
const app = require('./app');
const connectDB = require('./config/db');
const startCartAbandonmentJob = require('./cron/abandonedCart.job');
const logger = require('./config/logger');

const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const productionRequiredEnvVars = [
    'FRONTEND_URL',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_BUCKET_ID',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const isPlaceholderValue = (value = '') => {
    const normalized = String(value).trim().toLowerCase();
    return (
        !normalized ||
        normalized.startsWith('your_') ||
        normalized.includes('_here') ||
        normalized.includes('placeholder') ||
        normalized === 'fake_user' ||
        normalized === 'fake_pass'
    );
};

const envToValidate = process.env.NODE_ENV === 'production'
    ? [...requiredEnvVars, ...productionRequiredEnvVars]
    : requiredEnvVars;

const missing = envToValidate.filter((envVar) => isPlaceholderValue(process.env[envVar]));

if (process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_SAME_SITE === 'none' && !process.env.AUTH_COOKIE_DOMAIN) {
    logger.error('FATAL: AUTH_COOKIE_DOMAIN is required when AUTH_COOKIE_SAME_SITE is set to "none" in production.');
    process.exit(1);
}

if (missing.length > 0) {
    logger.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please check your environment configuration and try again.');
    process.exit(1);
}

const optionalProductionEnvGroups = [
    {
        vars: ['BACKEND_URL'],
        feature: 'local-file download URLs',
    },
    {
        vars: ['RAZORPAY_WEBHOOK_SECRET'],
        feature: 'Razorpay webhook verification',
    },
    {
        vars: ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USERNAME', 'EMAIL_PASSWORD', 'EMAIL_FROM'],
        feature: 'password reset and transactional emails',
    },
];

if (process.env.NODE_ENV === 'production') {
    optionalProductionEnvGroups.forEach(({ vars, feature }) => {
        const missingOptional = vars.filter((envVar) => isPlaceholderValue(process.env[envVar]));

        if (missingOptional.length > 0) {
            logger.warn(`[Config] Optional production env missing for ${feature}: ${missingOptional.join(', ')}`);
        }
    });
}

if (!process.env.JWT_EXPIRES_IN) {
    logger.warn('[Config] JWT_EXPIRES_IN not set - defaulting to 7d');
    process.env.JWT_EXPIRES_IN = '7d';
}

if (!process.env.SIGNED_URL_EXPIRY) {
    logger.warn('[Config] SIGNED_URL_EXPIRY not set - defaulting to 300 seconds');
    process.env.SIGNED_URL_EXPIRY = '300';
}

connectDB();
startCartAbandonmentJob();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

process.on('unhandledRejection', (err) => {
    logger.error({ message: 'UNHANDLED REJECTION - shutting down', name: err.name, error: err.message });
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    logger.warn('SIGTERM received. Closing server gracefully.');
    server.close(() => {
        mongoose.connection.close(false).finally(() => process.exit(0));
    });
});
