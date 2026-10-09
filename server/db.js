require('dotenv').config();
const { Pool } = require('pg');
const employeeCatalog = require('./data/employeeData');

const isCloudDb = !!process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root@1234',
      database: process.env.DB_NAME || 'biomatric_login',
      ssl: isCloudDb || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

// Helper for query execution
const query = (text, params) => pool.query(text, params);

let dbConnected = false;

function isDbConnected() {
  return dbConnected;
}

function formatDbError(err) {
  if (!err) return 'Unknown database error';
  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors.map(e => e.message || e.code).join('; ');
  }
  return err.message || err.code || String(err);
}

async function checkDbHealth() {
  try {
    await pool.query('SELECT 1');
    dbConnected = true;
    return true;
  } catch (err) {
    dbConnected = false;
    return false;
  }
}

/**
 * Auto-initializes PostgreSQL tables and seeds the authorized employees catalog
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DB] Connected to PostgreSQL. Initializing tables...');

    // 1. Employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(50),
        department VARCHAR(100),
        designation VARCHAR(100),
        company VARCHAR(100),
        employment_type VARCHAR(50),
        joining_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        face_registered BOOLEAN DEFAULT FALSE,
        face_embedding JSONB,
        face_registered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Attendances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id SERIAL PRIMARY KEY,
        employee_code VARCHAR(50) NOT NULL REFERENCES employees(employee_code),
        employee_name VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        designation VARCHAR(100),
        date DATE NOT NULL,
        punch_in_time TIMESTAMP NOT NULL,
        punch_out_time TIMESTAMP,
        total_work_minutes INTEGER,
        total_work_formatted VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Punched In',
        confidence_score DOUBLE PRECISION,
        device_info VARCHAR(100) DEFAULT 'InsightFace Biometric Kiosk',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Punch Logs table (audit trail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS punch_logs (
        id SERIAL PRIMARY KEY,
        employee_code VARCHAR(50),
        employee_name VARCHAR(100),
        punch_type VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL,
        message TEXT,
        confidence_score DOUBLE PRECISION,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Seed hardcoded employees if not present
    for (const emp of employeeCatalog) {
      await client.query(
        `
        INSERT INTO employees (
          employee_code, name, email, phone, department, designation,
          company, employment_type, joining_date, status, face_registered
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (employee_code) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          department = EXCLUDED.department,
          designation = EXCLUDED.designation,
          company = EXCLUDED.company,
          employment_type = EXCLUDED.employment_type,
          joining_date = EXCLUDED.joining_date,
          status = EXCLUDED.status;
        `,
        [
          emp.employeeCode,
          emp.name,
          emp.email,
          emp.phone,
          emp.department,
          emp.designation,
          emp.company,
          emp.employmentType,
          emp.joiningDate,
          emp.status,
          emp.faceRegistered,
        ]
      );
    }

    dbConnected = true;
    console.log(`[DB] Database schema and authorized employee catalog (${employeeCatalog.length} records) verified.`);
  } catch (err) {
    dbConnected = false;
    console.error('[DB] Database initialization error:', formatDbError(err));
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  initializeDatabase,
  isDbConnected,
  checkDbHealth,
  formatDbError,
};
