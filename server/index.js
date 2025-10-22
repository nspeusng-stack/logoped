require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const adminRoutes = require('./admin');
const applyRoutes = require('./apply');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and middleware
app.use(helmet());
app.use(morgan('dev'));

const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowed.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Ensure data and uploads dirs
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const UPLOADS_DIR = path.resolve(path.join(__dirname, '..', 'uploads'));
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Static frontend served from /public
const staticPath = path.join(__dirname, '..', 'public');
app.use('/', express.static(staticPath));

// API routes - registered after static to let static files serve first
app.use('/api/admin', adminRoutes);
app.use('/api', applyRoutes);

// Health check
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: String(err.message || 'Server error') });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
