import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(LOCAL_DB_FILE)) {
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all logs stored in local JSON fallback file
 */
export function getLocalLogs() {
  try {
    const data = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local logs:', err);
    return [];
  }
}

/**
 * Fetch logs with local JSON file fallback
 */
export async function getFallbackLogs() {
  return getLocalLogs();
}

/**
 * Save log locally in JSON fallback storage
 */
export async function saveFallbackLogEntry(logData) {
  const startTime = logData.startTime || logData.timestamp || new Date().toISOString();
  const endTime = logData.endTime || startTime;

  const newEntry = {
    id: logData.id || ('log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
    timestamp: startTime,
    startTime: startTime,
    endTime: endTime,
    recordedAt: logData.recordedAt || new Date().toISOString(),
    displayTime: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    displayDate: new Date(startTime).toLocaleDateString(),
    category: logData.category || 'other',
    subCategory: logData.subCategory || 'other',
    amount: logData.amount || '',
    duration: logData.duration || '',
    summaryEn: logData.summaryEn || '',
    originalZh: logData.originalZh || '',
    notes: logData.notes || '',
    attachments: logData.attachments || [],
  };

  const logs = getLocalLogs();
  logs.unshift(newEntry);
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(logs, null, 2));
  return newEntry;
}

/**
 * Delete log entry from local storage
 */
export function deleteFallbackLogEntry(id) {
  const logs = getLocalLogs();
  const filtered = logs.filter(l => l.id !== id);
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

/**
 * Update log entry in local JSON fallback storage
 */
export function updateFallbackLogEntry(id, logData) {
  const logs = getLocalLogs();
  const index = logs.findIndex(l => l.id === id);
  if (index === -1) return null;

  const startTime = logData.startTime || logData.timestamp || logs[index].startTime || logs[index].timestamp;
  const endTime = logData.endTime || logs[index].endTime || startTime;

  logs[index] = {
    ...logs[index],
    ...logData,
    id,
    startTime,
    endTime,
    timestamp: startTime,
    displayTime: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    displayDate: new Date(startTime).toLocaleDateString(),
  };

  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(logs, null, 2));
  return logs[index];
}
