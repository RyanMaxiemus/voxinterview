import dotenv from 'dotenv';

// Force reload environment variables
dotenv.config({ override: true });

// Validate environment variables
import { validateEnvironment } from './utils/validateEnv.js';
validateEnvironment();

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import analyzeRoute from './routes/analyze.js';
import interviewRoutes from './routes/interview.js';
import path from 'path';

const app = express();

// Trust proxy is required for cPanel/Nginx/Passenger to correctly identify protocol (http vs https)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow audio/media handling
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:', 'http://localhost:5000', 'https://RyanMaxie.tech'],
        connectSrc: [
          "'self'",
          'http://localhost:5000',
          'https://RyanMaxie.tech',
          'https://api.elevenlabs.io',
          'https://generativelanguage.googleapis.com'
        ]
      }
    }
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit uploads to 10 per 5 minutes
  message: 'Too many uploads, please try again later.'
});

app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://RyanMaxie.tech', 'https://www.RyanMaxie.tech'] // Replace with your production domain
        : ['http://localhost:3000', 'http://localhost:5173'], // Common dev ports
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply upload rate limiting to analyze route
const apiRouter = express.Router();
apiRouter.use('/analyze', uploadLimiter);
apiRouter.use('/analyze', analyzeRoute);
apiRouter.use('/interview', interviewRoutes);

app.use('/', apiRouter);
app.use('/vox-api', apiRouter);

const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/x-m4a',
}

// Secure static file serving
const staticFileMiddleware = express.static('uploads', {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    // Only allow audio files to be served
    if (!mimeTypes[ext]) {
      res.status(403).end();
      return;
    }

    // Set proper headers for audio files
    res.setHeader('Content-Type', mimeTypes[ext]);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
});

app.use('/uploads', staticFileMiddleware);
app.use('/vox-api/uploads', staticFileMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler - must be last middleware
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});