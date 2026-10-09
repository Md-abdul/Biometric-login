require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase, isDbConnected } = require('./db');
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
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'TechNova HRMS Biometric Attendance System',
    backend: 'Node.js Express + PostgreSQL + InsightFace AI',
    database: isDbConnected() ? 'connected' : 'disconnected (set DATABASE_URL in Render Environment settings)',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Initialize PostgreSQL database and seed catalog
  try {
    await initializeDatabase();
  } catch (dbErr) {
    console.warn('=======================================================');
    console.warn('⚠️ [Database Warning] Could not connect to PostgreSQL!');
    console.warn(`Details: ${dbErr.message}`);
    if (!process.env.DATABASE_URL) {
      console.warn('👉 Cause: "DATABASE_URL" environment variable is not set.');
      console.warn('👉 Fix on Render: Create a PostgreSQL database in Render Dashboard,');
      console.warn('   then copy its Internal Database URL into your Web Service');
      console.warn('   Environment tab as "DATABASE_URL".');
    }
    console.warn('💡 Continuing to start Express server. Database reconnection will retry in the background.');
    console.warn('=======================================================');

    // Periodic retry in background every 15 seconds
    const dbRetryTimer = setInterval(async () => {
      try {
        await initializeDatabase();
        console.log('✅ [Database] PostgreSQL connected and initialized successfully!');
        clearInterval(dbRetryTimer);
      } catch (_) {
        // Silently retry in the background
      }
    }, 15000);
  }

  // 2. Start / verify InsightFace Python microservice
  try {
    await startFaceService();
  } catch (faceErr) {
    console.warn('[Server Warning] InsightFace Python service start issue:', faceErr.message);
    console.warn('[Server Warning] Continuing to start Express server. Biometric requests will retry connection.');
  }

  // 3. Start Express server
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 HRMS Biometric Server running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoints available at http://localhost:${PORT}/api`);
    console.log(`🧠 AI Engine: InsightFace 2.1 (ONNX ArcFace buffalo_sc)`);
    console.log(`🐘 Database: ${isDbConnected() ? 'PostgreSQL (Connected & Seeded)' : 'Pending Connection (set DATABASE_URL)'}`);
    console.log(`=======================================================`);
  });
}

bootstrap();