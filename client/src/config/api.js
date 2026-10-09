/**
 * Centralized API Configuration & Endpoints
 * Reads backend base URL dynamically from environment variables (e.g. Vite's VITE_APP_BASE_URL)
 */

export const API_BASE_URL = (
  import.meta.env.VITE_APP_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ''
).trim().replace(/\/+$/, '');

/**
 * Builds a dynamic API URL given an endpoint path.
 * Ensures proper slash handling and avoids double "/api" if base URL already includes it.
 *
 * @param {string} path - Target path e.g. '/api/status' or 'api/employees'
 * @returns {string} - Full endpoint URL e.g. 'http://localhost:5000/api/status'
 */
export const apiUrl = (path = '') => {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path; // Already an absolute URL

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If base URL already ends with /api and cleanPath starts with /api/
  if (API_BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${API_BASE_URL}${cleanPath.slice(4)}`;
  }

  return `${API_BASE_URL}${cleanPath}`;
};

export const getApiUrl = apiUrl;

export const API_ENDPOINTS = {
  STATUS: apiUrl('/api/status'),
  EMPLOYEES: apiUrl('/api/employees'),
  EMPLOYEE_BY_CODE: (code) => apiUrl(`/api/employees/${encodeURIComponent(code)}`),
  ATTENDANCE_TODAY: apiUrl('/api/attendance/today'),
  ATTENDANCE_LOGS: apiUrl('/api/attendance/logs'),
  BIOMETRICS_REGISTER: apiUrl('/api/biometrics/register'),
  BIOMETRICS_PUNCH_IN: apiUrl('/api/biometrics/punch-in'),
  BIOMETRICS_PUNCH_OUT: apiUrl('/api/biometrics/punch-out'),
};

export default API_BASE_URL;
