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

const LOCAL_TIMERS_FILE = path.join(DATA_DIR, 'timers.json');

const defaultTimersState = {
  feedingSession: { id: 'active_session', status: 'idle', sessionType: 'feeding', startTime: null, endTime: null, expiresAt: null },
  openedBottles: [],
};

function getLocalTimers() {
  try {
    if (!fs.existsSync(LOCAL_TIMERS_FILE)) {
      fs.writeFileSync(LOCAL_TIMERS_FILE, JSON.stringify(defaultTimersState, null, 2));
      return defaultTimersState;
    }
    const data = fs.readFileSync(LOCAL_TIMERS_FILE, 'utf8');
    const parsed = JSON.parse(data || JSON.stringify(defaultTimersState));
    if (parsed.feedingSession && !parsed.feedingSession.sessionType) {
      parsed.feedingSession.sessionType = 'feeding';
    }
    return parsed;
  } catch (err) {
    console.error('Error reading local timers:', err);
    return defaultTimersState;
  }
}

function saveLocalTimers(state) {
  fs.writeFileSync(LOCAL_TIMERS_FILE, JSON.stringify(state, null, 2));
}

export async function getFallbackTimers() {
  const state = getLocalTimers();
  const now = new Date();

  // Check if feeding session is active but expired
  if (state.feedingSession && state.feedingSession.status === 'active' && state.feedingSession.expiresAt) {
    if (now >= new Date(state.feedingSession.expiresAt)) {
      state.feedingSession.status = 'ended';
      state.feedingSession.endTime = state.feedingSession.expiresAt;
      state.feedingSession.reason = 'expired';
      saveLocalTimers(state);
    }
  }

  return state;
}

export async function startFallbackFeedingSession(sessionType = 'feeding') {
  const state = getLocalTimers();
  const now = new Date();
  const expiresAt = sessionType === 'feeding' ? new Date(now.getTime() + 60 * 60 * 1000).toISOString() : null;

  state.feedingSession = {
    id: 'active_session',
    status: 'active',
    sessionType,
    startTime: now.toISOString(),
    endTime: null,
    expiresAt,
  };

  saveLocalTimers(state);
  return state.feedingSession;
}

export async function stopFallbackFeedingSession() {
  const state = getLocalTimers();
  const now = new Date();

  state.feedingSession = {
    ...state.feedingSession,
    status: 'ended',
    endTime: now.toISOString(),
  };

  saveLocalTimers(state);
  return state.feedingSession;
}

export async function resetFallbackFeedingSession() {
  const state = getLocalTimers();

  state.feedingSession = {
    id: 'active_session',
    status: 'idle',
    sessionType: 'feeding',
    startTime: null,
    endTime: null,
    expiresAt: null,
  };

  saveLocalTimers(state);
  return state.feedingSession;
}

export async function openFallbackFormulaBottle(bottleType) {
  const state = getLocalTimers();
  if (state.openedBottles.length >= 5) {
    throw new Error('Maximum limit of 5 opened bottles reached.');
  }

  const now = new Date();
  const hoursToAdd = bottleType === '237ml' ? 48 : 24;
  const expiresAt = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  const id = 'rtf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  const newBottle = {
    id,
    bottleType,
    openedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  state.openedBottles.unshift(newBottle);
  saveLocalTimers(state);
  return newBottle;
}

export async function finishFallbackFormulaBottle(id) {
  const state = getLocalTimers();
  state.openedBottles = state.openedBottles.filter(b => b.id !== id);
  saveLocalTimers(state);
  return true;
}

const LOCAL_BABY_PROFILE_FILE = path.join(DATA_DIR, 'baby_profile.json');

export async function getFallbackBabyProfile() {
  try {
    if (!fs.existsSync(LOCAL_BABY_PROFILE_FILE)) {
      return null;
    }
    const data = fs.readFileSync(LOCAL_BABY_PROFILE_FILE, 'utf8');
    return JSON.parse(data || 'null');
  } catch (err) {
    console.error('Error reading local baby profile:', err);
    return null;
  }
}

export async function saveFallbackBabyProfile(birthDate, name = 'Baby') {
  if (!birthDate) {
    if (fs.existsSync(LOCAL_BABY_PROFILE_FILE)) {
      fs.unlinkSync(LOCAL_BABY_PROFILE_FILE);
    }
    return null;
  }
  const profile = {
    id: 'default_baby',
    name,
    birthDate,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(LOCAL_BABY_PROFILE_FILE, JSON.stringify(profile, null, 2));
  return profile;
}

