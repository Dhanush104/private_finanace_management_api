require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const groupRoutes = require('./routes/groupRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const loanRoutes = require('./routes/loanRoutes');
const repaymentRoutes = require('./routes/repaymentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Security
app.use(helmet());
app.use(cors({
<<<<<<< HEAD
    origin: [
        'http://localhost:5173',
        'https://royal-star-boys.netlify.app',
        process.env.CLIENT_URL
    ].filter(Boolean),
=======
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
>>>>>>> main
    credentials: true,
}));

// Rate limiting — global (generous for normal app usage)
app.use(rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
}));

// Stricter limiter for auth routes only (brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

// Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Royal Star Boys API',
            version: '1.0.0',
            description: 'Private Community Fund Management System API',
        },
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
};
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));

// Health check
app.get('/api/health', (req, res) =>
    res.json({ success: true, message: 'Royal Star Boys API is running', timestamp: new Date().toISOString() })
);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((req, res) =>
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
