require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase, isDbConnected, checkDbHealth, formatDbError } = require('./db');
const { startFaceService } = require('./services/faceService');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Support large base64 image payloads from camera
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Health check root
app.get('/', async (req, res) => {
  let dbStatus = isDbConnected();
  if (!dbStatus && (process.env.DATABASE_URL || process.env.DB_HOST)) {
    dbStatus = await checkDbHealth();
  }
  res.json({
    status: 'online',
    app: 'TechNova HRMS Biometric Attendance System',
    backend: 'Node.js Express + PostgreSQL + InsightFace AI',
    database: dbStatus ? 'connected' : 'disconnected (set DATABASE_URL in Render Environment settings)',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: formatDbError(err) || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Start Express server IMMEDIATELY so Render's health checks succeed in seconds
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 HRMS Biometric Server listening on port ${PORT}`);
    console.log(`📡 Health Check URL: http://0.0.0.0:${PORT}/`);
    console.log(`📡 API Endpoints available at http://0.0.0.0:${PORT}/api`);
    console.log(`🧠 AI Engine: Initializing InsightFace 2.1 in background...`);
    console.log(`🐘 Database: Connecting to PostgreSQL in background...`);
    console.log(`=======================================================`);
  });

  // 2. Initialize PostgreSQL database and seed catalog
  try {
    await initializeDatabase();
    console.log(`🐘 [Database] PostgreSQL connected and employee catalog verified!`);
  } catch (dbErr) {
    const errorMsg = formatDbError(dbErr);
    console.warn('=======================================================');
    console.warn('⚠️ [Database Warning] Could not connect to PostgreSQL!');
    console.warn(`Details: ${errorMsg}`);
    if (!process.env.DATABASE_URL) {
      console.warn('👉 Cause: "DATABASE_URL" environment variable is not set.');
      console.warn('👉 Fix on Render: Create a PostgreSQL database in Render Dashboard,');
      console.warn('   then copy its Internal Database URL into your Web Service');
      console.warn('   Environment tab as "DATABASE_URL".');
    }
    console.warn('💡 Continuing to serve requests. Database reconnection will retry in the background.');
    console.warn('=======================================================');

    // Periodic retry in background every 10 seconds
    const dbRetryTimer = setInterval(async () => {
      try {
        await initializeDatabase();
        console.log('✅ [Database] PostgreSQL connected and initialized successfully!');
        clearInterval(dbRetryTimer);
      } catch (_) {
        // Silently retry in the background
      }
    }, 10000);
  }

  // 3. Start / verify InsightFace Python microservice
  try {
    await startFaceService();
  } catch (faceErr) {
    console.warn('[Server Warning] InsightFace Python service start issue:', faceErr.message);
    console.warn('[Server Warning] Continuing to serve requests. Biometric requests will retry connection.');
  }
}

bootstrap();