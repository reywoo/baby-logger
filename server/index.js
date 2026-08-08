import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processAudioWithGemini, processTextWithGemini, validateAndFormatLogWithGemini } from './geminiService.js';
import { getFallbackLogs, saveFallbackLogEntry, deleteFallbackLogEntry, updateFallbackLogEntry } from './localJsonService.js';
import { initDb, getDbLogs, getDbLogsFiltered, getExistingSubCategories, saveDbLogEntry, updateDbLogEntry, deleteDbLogEntry } from './db.js';

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

// Passcode authentication middleware for /api/* endpoints
app.use('/api', (req, res, next) => {
  const expectedPasscode = process.env.APP_PASSCODE;
  if (!expectedPasscode) {
    return next();
  }

  const providedPasscode = req.headers['x-app-passcode'] || req.query.passcode;
  if (providedPasscode && providedPasscode === expectedPasscode) {
    return next();
  }

  return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or missing passcode' });
});

// Auth Verification Endpoint
app.get('/api/auth/verify', (req, res) => {
  res.json({ success: true, authenticated: true });
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

// 1. Process Raw Audio with Gemini
app.post('/api/process-audio', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    const mimeType = req.file.mimetype || 'audio/webm';
    
    console.log(`Processing audio snippet (${req.file.size} bytes, ${mimeType})...`);

    const subCategoriesMap = await getExistingSubCategories();
    const parsedLog = await processAudioWithGemini(req.file.buffer, mimeType, apiKey, subCategoriesMap);
    res.json({ success: true, data: parsedLog });
  } catch (error) {
    console.error('API /process-audio error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Process Text Fallback with Gemini
app.post('/api/process-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    const subCategoriesMap = await getExistingSubCategories();
    const parsedLog = await processTextWithGemini(text, apiKey, subCategoriesMap);
    res.json({ success: true, data: parsedLog });
  } catch (error) {
    console.error('API /process-text error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2.5 Sanity Check and Format Validation
app.post('/api/validate-log', async (req, res) => {
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


// 3. Get Logs
app.get('/api/logs', async (req, res) => {
  try {
    try {
      const logs = await getDbLogs();
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

// 3b. Export Logs Endpoint (supports format=csv or format=json)
app.get('/api/logs/export', async (req, res) => {
  try {
    const { startDate, endDate, category, format } = req.query;

    let logs = [];
    try {
      logs = await getDbLogsFiltered({ startDate, endDate, category });
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
        const row = [
          escapeCsv(log.id),
          escapeCsv(log.displayDate || ''),
          escapeCsv(log.displayTime || ''),
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


// 4. Save Log Entry (supports optional multipart photo attachments)
app.post('/api/logs', uploadPhotos.array('photos', 5), async (req, res) => {
  try {
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
      const savedEntry = await saveDbLogEntry(logData, attachments);
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

// 5. Update Log Entry
app.put('/api/logs/:id', uploadPhotos.array('photos', 5), async (req, res) => {
  try {
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
      const updatedEntry = await updateDbLogEntry(id, logData, newAttachments, removedAttachmentIds);
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


// 5. Delete Log Entry
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await deleteDbLogEntry(id);
    } catch (dbErr) {
      console.warn('PostgreSQL delete fallback to local storage:', dbErr.message);
      deleteFallbackLogEntry(id);
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
