require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');
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
  try {
    // 1. Initialize PostgreSQL database and seed catalog
    await initializeDatabase();

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
      console.log(`🐘 Database: PostgreSQL (Connected & Seeded)`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();