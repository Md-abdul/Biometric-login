const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const PYTHON_PORT = process.env.PYTHON_SERVICE_PORT || 5001;
const PYTHON_URL = `http://127.0.0.1:${PYTHON_PORT}`;

// Dynamically resolve python executable with safety fallback for cloud Linux environments
let configuredPython = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
if (process.platform !== 'win32' && /^[a-zA-Z]:\\/.test(configuredPython)) {
  console.warn(`[FaceService] Windows path detected on Linux platform: "${configuredPython}". Falling back to "python3".`);
  configuredPython = 'python3';
}
const PYTHON_EXE = configuredPython;
const SCRIPT_PATH = path.join(__dirname, '..', 'python', 'face_service.py');

let pythonProcess = null;

/**
 * Checks if the Python InsightFace microservice is responsive.
 */
async function isServiceHealthy() {
  try {
    const res = await axios.get(`${PYTHON_URL}/health`, { timeout: 2000 });
    return res.status === 200 && res.data.status === 'online';
  } catch (err) {
    return false;
  }
}

/**
 * Spawns the Python InsightFace microservice and waits until it is ready.
 */
async function startFaceService() {
  const alreadyRunning = await isServiceHealthy();
  if (alreadyRunning) {
    console.log(`[FaceService] Python InsightFace microservice is already running on ${PYTHON_URL}`);
    return;
  }

  console.log(`[FaceService] Starting InsightFace Python service using ${PYTHON_EXE}...`);
  pythonProcess = spawn(PYTHON_EXE, [SCRIPT_PATH], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PYTHON_SERVICE_PORT: String(PYTHON_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[InsightFace PyOut] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[InsightFace PyErr] ${data.toString().trim()}`);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[FaceService] Python service stopped (code: ${code}, signal: ${signal})`);
    pythonProcess = null;
  });

  // Poll for up to 60 seconds for the service to become ready (allows time for cloud model download/init)
  const startTime = Date.now();
  while (Date.now() - startTime < 60000) {
    const healthy = await isServiceHealthy();
    if (healthy) {
      console.log(`[FaceService] Python InsightFace service is READY and active at ${PYTHON_URL}!`);
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  throw new Error('Timed out waiting for InsightFace Python service to initialize.');
}

/**
 * Extracts facial embedding vector from a captured image.
 * @param {string} base64Image
 * @returns {Promise<{success: boolean, embedding?: number[], bbox?: number[], detScore?: number, error?: string}>}
 */
async function extractFace(base64Image) {
  try {
    const response = await axios.post(
      `${PYTHON_URL}/extract-face`,
      { image: base64Image },
      { timeout: 15000 }
    );
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return err.response.data;
    }
    return {
      success: false,
      error: err.message || 'Face extraction request failed.',
    };
  }
}

/**
 * Matches face image against all registered employee embeddings.
 * @param {string} base64Image
 * @param {Array} registeredEmployees
 * @param {number} threshold
 */
async function matchFace(base64Image, registeredEmployees, threshold = 0.50) {
  try {
    const response = await axios.post(
      `${PYTHON_URL}/match-face`,
      {
        image: base64Image,
        registeredEmployees,
        threshold,
      },
      { timeout: 15000 }
    );
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return err.response.data;
    }
    return {
      success: false,
      error: err.message || 'Face matching request failed.',
    };
  }
}

// Graceful cleanup on process termination
process.on('exit', () => {
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch (_) {}
  }
});

module.exports = {
  startFaceService,
  isServiceHealthy,
  extractFace,
  matchFace,
};
