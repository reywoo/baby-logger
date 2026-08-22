import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processAudioWithGemini, processTextWithGemini, validateAndFormatLogWithGemini } from './geminiService.js';
import { 
  getFallbackLogs, saveFallbackLogEntry, deleteFallbackLogEntry, updateFallbackLogEntry,
  getFallbackTimers, startFallbackFeedingSession, stopFallbackFeedingSession, resetFallbackFeedingSession, openFallbackFormulaBottle, finishFallbackFormulaBottle,
  getFallbackBabyProfile, saveFallbackBabyProfile
} from './localJsonService.js';
import { 
  initDb, queryDb, getDbLogs, getDbLogsFiltered, getExistingSubCategories, saveDbLogEntry, updateDbLogEntry, deleteDbLogEntry,
  getDbTimersState, startDbFeedingSession, stopDbFeedingSession, resetDbFeedingSession, openDbFormulaBottle, finishDbFormulaBottle,
  getDbBabyProfile, saveDbBabyProfile,
  getDbAccountByUsername, getDbAccountByEmail, getDbAccountByGoogleId, getDbAccountById, createDbAccount, getAllDbAccounts, deleteDbAccount, countDbGoogleAccounts, updateDbAccountPassword
} from './db.js';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../data/uploads/photos');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Disk storage for photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadPhotos = multer({
  storage: photoStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max per image
});

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded photos statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize PostgreSQL DB asynchronously on server start
initDb().catch((err) => console.warn('DB init warning:', err.message));

import { 
  hashPassword, comparePassword, generateToken, verifyToken, verifyGoogleToken, authenticateToken, requireAdmin 
} from './authService.js';

// Public Auth Endpoints (No Token Required)

function getMaxGoogleAccounts() {
  const val = parseInt(process.env.MAX_GOOGLE_ACCOUNTS, 10);
  return Number.isFinite(val) && val > 0 ? val : 10;
}

// 0. Public Auth Config (Google Client ID, etc.)
app.get('/api/auth/config', (req, res) => {
  res.json({
    success: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
    maxGoogleAccounts: getMaxGoogleAccounts(),
  });
});

// 1. Password Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const account = await getDbAccountByUsername(username);
    if (!account) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    if (account.auth_provider === 'google' || account.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        error: 'This account is linked to Google. Please sign in with Google.'
      });
    }

    if (!account.password_hash) {
      return res.status(401).json({ success: false, error: 'Password is not set for this account.' });
    }

    const isMatch = await comparePassword(password, account.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = generateToken(account);
    const userPayload = {
      id: account.id,
      username: account.username,
      email: account.email,
      role: account.role || 'user',
      authProvider: account.auth_provider || account.authProvider || 'local',
      displayName: account.display_name || account.displayName || account.username,
      avatarUrl: account.avatar_url || account.avatarUrl || null,
    };

    return res.json({ success: true, token, user: userPayload });
  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Google OAuth Login Endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential ID token is required' });
    }

    const googlePayload = await verifyGoogleToken(credential);
    let account = await getDbAccountByGoogleId(googlePayload.googleId);
    if (!account && googlePayload.email) {
      account = await getDbAccountByEmail(googlePayload.email);
    }
    if (!account && googlePayload.email) {
      account = await getDbAccountByUsername(googlePayload.email.split('@')[0]);
    }

    if (!account) {
      // Check current count of Google accounts in DB (maximum allowed from MAX_GOOGLE_ACCOUNTS)
      const maxGoogleAccounts = getMaxGoogleAccounts();
      const googleCount = await countDbGoogleAccounts();
      if (googleCount >= maxGoogleAccounts) {
        return res.status(403).json({
          success: false,
          error: `Google 登录已达系统名额上限（系统最多允许 ${maxGoogleAccounts} 个 Google 账号）。请联系管理员。 / Google accounts limit reached (max ${maxGoogleAccounts} accounts). Please contact an administrator.`
        });
      }

      // Auto-create new user account for family & friends
      account = await createDbAccount({
        username: googlePayload.email.split('@')[0],
        email: googlePayload.email,
        role: 'user',
        authProvider: 'google',
        googleId: googlePayload.googleId,
        displayName: googlePayload.name,
        avatarUrl: googlePayload.picture,
      });
    } else {
      // Link or refresh Google info if needed
      if (!account.google_id && !account.googleId) {
        await queryDb('UPDATE accounts SET google_id = $1, auth_provider = \'google\', avatar_url = COALESCE(avatar_url, $2) WHERE id = $3', [
          googlePayload.googleId, googlePayload.picture, account.id
        ]);
        account.google_id = googlePayload.googleId;
        account.auth_provider = 'google';
      }
    }

    const token = generateToken(account);
    const userPayload = {
      id: account.id,
      username: account.username,
      email: account.email,
      role: account.role || 'user',
      authProvider: account.auth_provider || account.authProvider || 'google',
      displayName: account.display_name || account.displayName || googlePayload.name,
      avatarUrl: account.avatar_url || account.avatarUrl || googlePayload.picture,
    };

    return res.json({ success: true, token, user: userPayload });
  } catch (error) {
    console.error('Google Auth endpoint error:', error);
    res.status(401).json({ success: false, error: 'Google authentication failed: ' + error.message });
  }
});

// 3. Verify / Get Current User Endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const account = await getDbAccountById(req.user.id);
    const userPayload = account ? {
      id: account.id,
      username: account.username,
      email: account.email,
      role: account.role || 'user',
      authProvider: account.authProvider || account.auth_provider || 'local',
      displayName: account.displayName || account.display_name || account.username,
      avatarUrl: account.avatarUrl || account.avatar_url || null,
    } : req.user;

    res.json({ success: true, authenticated: true, user: userPayload });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Legacy passcode verification endpoint for backward compatibility
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ success: true, authenticated: true, user: req.user });
});

// Admin Account Management Endpoints

// List all accounts (Admin only)
app.get('/api/admin/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const accounts = await getAllDbAccounts();
    const googleAccountsCount = await countDbGoogleAccounts();
    res.json({ success: true, accounts, googleAccountsCount, maxGoogleAccounts: getMaxGoogleAccounts() });
  } catch (error) {
    console.error('List accounts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new account manually (Admin only)
app.post('/api/admin/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'user', email = null, displayName = null } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const existing = await getDbAccountByUsername(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this username already exists' });
    }

    const newAccount = await createDbAccount({
      username,
      password,
      role: role === 'admin' ? 'admin' : 'user',
      email,
      authProvider: 'local',
      displayName: displayName || username,
    });

    res.json({ success: true, account: newAccount });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete account (Admin only)
app.delete('/api/admin/accounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own active admin account' });
    }

    await deleteDbAccount(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change password for non-Google account (Admin only)
app.put('/api/admin/accounts/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码至少需要 6 个字符 / New password must be at least 6 characters'
      });
    }

    await updateDbAccountPassword(id, password.trim());
    res.json({ success: true, message: '密码修改成功 / Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// 0. Subcategories List Endpoint
app.get('/api/subcategories', async (req, res) => {
  try {
    const subCategories = await getExistingSubCategories();
    res.json({ success: true, subCategories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Baby Profile Endpoints (Scoped per account)
app.get('/api/baby-profile', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    let profile = null;
    try {
      profile = await getDbBabyProfile(accountId);
    } catch (err) {
      console.warn('DB getBabyProfile failed, using JSON fallback:', err.message);
      profile = await getFallbackBabyProfile(accountId);
    }
    if (!profile) {
      profile = await getFallbackBabyProfile(accountId);
    }
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/baby-profile', authenticateToken, uploadPhotos.single('photo'), async (req, res) => {
  try {
    const accountId = req.user?.id;
    let payload = req.body || {};
    if (typeof payload.profileData === 'string') {
      try {
        payload = JSON.parse(payload.profileData);
      } catch (e) {}
    }

    const birthDate = payload.birthDate || null;
    const firstName = payload.firstName || null;
    const lastName = payload.lastName || null;
    const nickname = payload.nickname || null;
    const gender = payload.gender || null;
    let avatarUrl = payload.avatarUrl || null;
    const name = nickname || firstName || payload.name || 'Baby';

    if (req.file) {
      avatarUrl = '/uploads/' + req.file.filename;
    }

    const profileData = {
      birthDate,
      firstName,
      lastName,
      nickname,
      gender,
      avatarUrl,
      name,
    };

    let profile = null;
    try {
      profile = await saveDbBabyProfile(profileData, accountId);
    } catch (err) {
      console.warn('DB saveBabyProfile failed, saving to JSON fallback:', err.message);
      profile = await saveFallbackBabyProfile(profileData, accountId);
    }
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Save baby profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function fetchUserBabyProfile(accountId = null) {
  try {
    let p = await getDbBabyProfile(accountId);
    if (!p) p = await getFallbackBabyProfile(accountId);
    return p || null;
  } catch (e) {
    return await getFallbackBabyProfile(accountId);
  }
}

// 1. Process Raw Audio with Gemini
app.post('/api/process-audio', authenticateToken, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    const mimeType = req.file.mimetype || 'audio/webm';
    
    console.log(`Processing audio snippet (${req.file.size} bytes, ${mimeType})...`);

    const babyProfile = await fetchUserBabyProfile(req.user?.id);
    const subCategoriesMap = await getExistingSubCategories();
    const parsedLog = await processAudioWithGemini(req.file.buffer, mimeType, apiKey, subCategoriesMap, babyProfile);
    res.json({ success: true, data: parsedLog });
  } catch (error) {
    console.error('API /process-audio error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Process Text Fallback with Gemini
app.post('/api/process-text', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    const babyProfile = await fetchUserBabyProfile(req.user?.id);
    const subCategoriesMap = await getExistingSubCategories();
    const parsedLog = await processTextWithGemini(text, apiKey, subCategoriesMap, babyProfile);
    res.json({ success: true, data: parsedLog });
  } catch (error) {
    console.error('API /process-text error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2.5 Sanity Check and Format Validation
app.post('/api/validate-log', authenticateToken, async (req, res) => {
  try {
    const { logData } = req.body;
    if (!logData) {
      return res.status(400).json({ error: 'logData payload is required' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    const validation = await validateAndFormatLogWithGemini(logData, apiKey);
    res.json({ success: true, validation });
  } catch (error) {
    console.error('API /validate-log error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      validation: {
        isValid: true,
        reason: null,
        suggestedAmount: req.body?.logData?.amount || '',
        suggestedDuration: req.body?.logData?.duration || '',
        formattedAmount: (req.body?.logData?.amount || '').replace(/\s+/g, ' ').trim(),
        formattedDuration: (req.body?.logData?.duration || '').replace(/\s+/g, ' ').trim(),
      }
    });
  }
});


// 3. Get Logs (Scoped per account)
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    try {
      const logs = await getDbLogs(accountId);
      return res.json({ success: true, logs, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL query failed, falling back to local storage:', dbErr.message);
      const logs = await getFallbackLogs();
      return res.json({ success: true, logs, source: 'json_fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3b. Export Logs Endpoint (supports format=csv or format=json, scoped per account)
app.get('/api/logs/export', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { startDate, endDate, category, format } = req.query;

    let logs = [];
    try {
      logs = await getDbLogsFiltered({ accountId, startDate, endDate, category });
    } catch (dbErr) {
      console.warn('PostgreSQL export query failed, using all local logs:', dbErr.message);
      logs = await getFallbackLogs();
      if (startDate || endDate || (category && category !== 'all')) {
        const startMs = startDate ? new Date(startDate).getTime() : 0;
        const endMs = endDate ? new Date(endDate).getTime() : Infinity;
        logs = logs.filter((l) => {
          const tMs = new Date(l.startTime || l.timestamp || l.displayDate).getTime();
          const matchTime = isNaN(tMs) || (tMs >= startMs && tMs <= endMs);
          const matchCat = !category || category === 'all' || l.category === category;
          return matchTime && matchCat;
        });
      }
    }

    if (format === 'csv') {
      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        'ID', 'Date', 'Time', 'Category', 'SubCategory',
        'Amount', 'Duration', 'Start Time', 'End Time',
        'Chinese Record', 'English Summary', 'Notes', 'Attachments Count'
      ];

      const csvRows = [headers.join(',')];

      for (const log of logs) {
        const dDate = log.displayDate || (log.startTime ? new Date(log.startTime).toLocaleDateString() : '');
        const dTime = log.displayTime || (log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
        const row = [
          escapeCsv(log.id),
          escapeCsv(dDate),
          escapeCsv(dTime),
          escapeCsv(log.category || ''),
          escapeCsv(log.subCategory || ''),
          escapeCsv(log.amount || ''),
          escapeCsv(log.duration || ''),
          escapeCsv(log.startTime || log.timestamp || ''),
          escapeCsv(log.endTime || ''),
          escapeCsv(log.originalZh || ''),
          escapeCsv(log.summaryEn || ''),
          escapeCsv(log.notes || ''),
          escapeCsv((log.attachments || []).length)
        ];
        csvRows.push(row.join(','));
      }

      // Add UTF-8 BOM prefix for Excel Chinese character compatibility
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const filename = `baby_logs_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    }

    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 4. Save Log Entry (supports optional multipart photo attachments, scoped per account)
app.post('/api/logs', authenticateToken, uploadPhotos.array('photos', 5), async (req, res) => {
  try {
    const accountId = req.user?.id;
    let logData = req.body;
    if (logData && logData.logData) {
      if (typeof logData.logData === 'string') {
        try {
          logData = JSON.parse(logData.logData);
        } catch (e) {
          logData = logData.logData;
        }
      } else {
        logData = logData.logData;
      }
    }

    const uploadedFiles = req.files || [];
    const attachments = uploadedFiles.map((file) => ({
      fileName: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      caption: req.body.caption || null,
    }));

    try {
      const savedEntry = await saveDbLogEntry(logData, attachments, accountId);
      return res.json({ success: true, entry: savedEntry, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL save failed, falling back to local storage:', dbErr.message);
      const savedEntry = await saveFallbackLogEntry(logData);
      return res.json({ success: true, entry: savedEntry, source: 'json_fallback' });
    }
  } catch (error) {
    console.error('Save log error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Update Log Entry (scoped per account)
app.put('/api/logs/:id', authenticateToken, uploadPhotos.array('photos', 5), async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { id } = req.params;
    let logData = req.body;
    if (logData && logData.logData) {
      if (typeof logData.logData === 'string') {
        try {
          logData = JSON.parse(logData.logData);
        } catch (e) {
          logData = logData.logData;
        }
      } else {
        logData = logData.logData;
      }
    }

    let removedAttachmentIds = [];
    if (req.body.removedAttachmentIds) {
      try {
        removedAttachmentIds = typeof req.body.removedAttachmentIds === 'string'
          ? JSON.parse(req.body.removedAttachmentIds)
          : req.body.removedAttachmentIds;
      } catch (e) {
        // fail gracefully
      }
    }

    const uploadedFiles = req.files || [];
    const newAttachments = uploadedFiles.map((file) => ({
      fileName: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      caption: req.body.caption || null,
    }));

    try {
      const updatedEntry = await updateDbLogEntry(id, logData, newAttachments, removedAttachmentIds, accountId);
      return res.json({ success: true, entry: updatedEntry, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL update failed, falling back to local storage:', dbErr.message);
      const updatedEntry = updateFallbackLogEntry(id, logData);
      return res.json({ success: true, entry: updatedEntry, source: 'json_fallback' });
    }
  } catch (error) {
    console.error('Update log error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 6. Delete Log Entry (scoped per account)
app.delete('/api/logs/:id', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { id } = req.params;
    try {
      await deleteDbLogEntry(id, accountId);
    } catch (dbErr) {
      console.warn('PostgreSQL delete fallback to local storage:', dbErr.message);
      deleteFallbackLogEntry(id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==========================================
// TIMER & EXPIRY ENDPOINTS (Scoped per account)
// ==========================================

// GET all timers (feeding session & RTF bottles)
app.get('/api/timers', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    try {
      const state = await getDbTimersState(accountId);
      return res.json({ success: true, ...state, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL get timers fallback to local storage:', dbErr.message);
      const state = await getFallbackTimers(accountId);
      return res.json({ success: true, ...state, source: 'json_fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST start feeding/sleeping session
app.post('/api/timers/feeding/start', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    const sessionType = req.body?.sessionType || 'feeding';
    try {
      const session = await startDbFeedingSession(sessionType, accountId);
      return res.json({ success: true, session, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL start feeding timer fallback to local storage:', dbErr.message);
      const session = await startFallbackFeedingSession(sessionType, accountId);
      return res.json({ success: true, session, source: 'json_fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST stop feeding session (sets state to 'ended')
app.post('/api/timers/feeding/stop', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    try {
      const session = await stopDbFeedingSession(accountId);
      return res.json({ success: true, session, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL stop feeding timer fallback to local storage:', dbErr.message);
      const session = await stopFallbackFeedingSession(accountId);
      return res.json({ success: true, session, source: 'json_fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST reset feeding session to idle
app.post('/api/timers/feeding/reset', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    try {
      const session = await resetDbFeedingSession(accountId);
      return res.json({ success: true, session, source: 'postgres' });
    } catch (dbErr) {
      console.warn('PostgreSQL reset feeding timer fallback to local storage:', dbErr.message);
      const session = await resetFallbackFeedingSession(accountId);
      return res.json({ success: true, session, source: 'json_fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST open a Ready-To-Feed bottle ('237ml' or '59ml')
app.post('/api/timers/bottles/open', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { bottleType } = req.body;
    if (!bottleType || !['237ml', '59ml'].includes(bottleType)) {
      return res.status(400).json({ success: false, error: 'Invalid bottleType. Must be 237ml or 59ml' });
    }

    try {
      const newBottle = await openDbFormulaBottle(bottleType, accountId);
      return res.json({ success: true, bottle: newBottle, source: 'postgres' });
    } catch (dbErr) {
      if (dbErr.message.includes('Maximum limit')) {
        return res.status(400).json({ success: false, error: dbErr.message });
      }
      console.warn('PostgreSQL open RTF bottle fallback to local storage:', dbErr.message);
      const newBottle = await openFallbackFormulaBottle(bottleType, accountId);
      return res.json({ success: true, bottle: newBottle, source: 'json_fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE finish/discard an opened RTF bottle
app.delete('/api/timers/bottles/:id', authenticateToken, async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { id } = req.params;
    try {
      await finishDbFormulaBottle(id, accountId);
    } catch (dbErr) {
      console.warn('PostgreSQL finish RTF bottle fallback to local storage:', dbErr.message);
      await finishFallbackFormulaBottle(id, accountId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Serve static frontend assets in production mode
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`  Family Assistant App running on port ${PORT}`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  LAN Access: http://0.0.0.0:${PORT}`);
  console.log(`=================================================`);
});
