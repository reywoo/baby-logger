import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

function createPool(host) {
  const p = new Pool({
    host: host,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'family_assistant',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres_password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  p.on('error', (err) => {
    console.warn('Unexpected error on idle PostgreSQL client:', err.message);
  });

  return p;
}

let activeHost = process.env.POSTGRES_HOST || 'postgres';
let pool = createPool(activeHost);

async function getPoolClient() {
  try {
    return await pool.connect();
  } catch (err) {
    if (activeHost !== 'localhost' && activeHost !== '127.0.0.1') {
      try {
        console.warn(`Connecting to DB host '${activeHost}' failed (${err.message}). Retrying on 'localhost'...`);
        activeHost = 'localhost';
        pool = createPool('localhost');
        return await pool.connect();
      } catch (localErr) {
        throw localErr;
      }
    }
    throw err;
  }
}

export async function queryDb(text, params) {
  const client = await getPoolClient();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

function parseDurationToMinutes(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const str = durationStr.toLowerCase().trim();
  let totalMinutes = 0;
  const hrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)/);
  if (hrMatch) totalMinutes += parseFloat(hrMatch[1]) * 60;
  const minMatch = str.match(/(\d+)\s*(?:min|mins|minute|minutes|m)(?!\w)/);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
  if (totalMinutes === 0) {
    const numOnlyMatch = str.match(/^(\d+)$/);
    if (numOnlyMatch) totalMinutes = parseInt(numOnlyMatch[1], 10);
  }
  return Math.round(totalMinutes);
}

function calculateDurationBetween(startIso, endIso) {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '';
  const minutes = Math.round(diffMs / (1000 * 60));
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} mins`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  return `${mins} mins`;
}

function calculateEndTimeFromDuration(startIso, durationStr) {
  const start = startIso ? new Date(startIso) : new Date();
  if (isNaN(start.getTime())) return new Date().toISOString();
  const minutes = parseDurationToMinutes(durationStr);
  return new Date(start.getTime() + minutes * 60 * 1000).toISOString();
}

/**
 * Initialize Database tables if not existing
 */
export async function initDb() {
  try {
    const client = await getPoolClient();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS action_logs (
            id VARCHAR(64) PRIMARY KEY,
            category VARCHAR(50) NOT NULL,
            sub_category VARCHAR(50) NOT NULL DEFAULT 'other',
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            amount VARCHAR(100),
            duration VARCHAR(50),
            summary_en TEXT,
            original_zh TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS action_attachments (
            id SERIAL PRIMARY KEY,
            action_id VARCHAR(64) NOT NULL REFERENCES action_logs(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(512) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_size BIGINT NOT NULL,
            caption TEXT,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS feeding_timers (
            id VARCHAR(64) PRIMARY KEY,
            status VARCHAR(20) NOT NULL DEFAULT 'idle',
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            expires_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS opened_formula_bottles (
            id VARCHAR(64) PRIMARY KEY,
            bottle_type VARCHAR(20) NOT NULL,
            opened_at TIMESTAMPTZ NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_action_logs_start_time ON action_logs(start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_action_logs_category ON action_logs(category, sub_category);
        CREATE INDEX IF NOT EXISTS idx_action_attachments_action_id ON action_attachments(action_id);
      `);
      console.log('PostgreSQL Database schema initialized successfully.');
    } finally {
      client.release();
    }
    return true;
  } catch (err) {
    console.warn('PostgreSQL DB initialization deferred (will fallback to local JSON file if unavailable):', err.message);
    return false;
  }
}

/**
 * Default preset subcategories
 */
export const DEFAULT_SUBCATEGORIES = {
  feeding: ['formula', 'breastmilk', 'solids'],
  sleep: ['nap', 'night_sleep'],
  diaper: ['wet', 'dirty', 'both'],
  health: ['medicine', 'temperature', 'vaccine', 'symptom', 'doctor'],
  activity: ['tummy_time', 'play', 'outdoor', 'bath', 'reading'],
  other: ['other'],
};

/**
 * Get fixed subcategories map of default presets
 */
export async function getExistingSubCategories() {
  return JSON.parse(JSON.stringify(DEFAULT_SUBCATEGORIES));
}

/**
 * Get all logs with photo attachments from PostgreSQL database
 */

export async function getDbLogs() {
  const query = `
    SELECT 
      l.id,
      l.category,
      l.sub_category AS "subCategory",
      l.start_time AS "startTime",
      l.end_time AS "endTime",
      l.recorded_at AS "recordedAt",
      l.amount,
      l.duration,
      l.summary_en AS "summaryEn",
      l.original_zh AS "originalZh",
      l.notes,
      l.created_at AS "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'id', a.id,
            'fileName', a.file_name,
            'filePath', a.file_path,
            'url', '/uploads/' || a.file_name,
            'mimeType', a.mime_type,
            'fileSize', a.file_size,
            'caption', a.caption,
            'uploadedAt', a.uploaded_at
          )
        ) FILTER (WHERE a.id IS NOT NULL), '[]'
      ) AS attachments
    FROM action_logs l
    LEFT JOIN action_attachments a ON l.id = a.action_id
    GROUP BY l.id
    ORDER BY l.start_time DESC, l.recorded_at DESC;
  `;

  const res = await queryDb(query);
  return res.rows.map((row) => {
    let dur = row.duration || '';
    if (!dur && row.startTime && row.endTime && row.startTime !== row.endTime) {
      dur = calculateDurationBetween(row.startTime, row.endTime);
    }
    return {
      ...row,
      duration: dur,
      displayTime: new Date(row.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      displayDate: new Date(row.startTime).toLocaleDateString(),
      timestamp: row.startTime,
    };
  });
}

/**
 * Get filtered logs by start/end date and category
 */
export async function getDbLogsFiltered({ startDate, endDate, category } = {}) {
  const whereConditions = [];
  const queryParams = [];

  if (startDate) {
    queryParams.push(new Date(startDate).toISOString());
    whereConditions.push(`l.start_time >= $${queryParams.length}`);
  }

  if (endDate) {
    queryParams.push(new Date(endDate).toISOString());
    whereConditions.push(`l.start_time <= $${queryParams.length}`);
  }

  if (category && category !== 'all') {
    queryParams.push(category);
    whereConditions.push(`l.category = $${queryParams.length}`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      l.id,
      l.category,
      l.sub_category AS "subCategory",
      l.start_time AS "startTime",
      l.end_time AS "endTime",
      l.recorded_at AS "recordedAt",
      l.amount,
      l.duration,
      l.summary_en AS "summaryEn",
      l.original_zh AS "originalZh",
      l.notes,
      l.created_at AS "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'id', a.id,
            'fileName', a.file_name,
            'filePath', a.file_path,
            'url', '/uploads/' || a.file_name,
            'mimeType', a.mime_type,
            'fileSize', a.file_size,
            'caption', a.caption,
            'uploadedAt', a.uploaded_at
          )
        ) FILTER (WHERE a.id IS NOT NULL), '[]'
      ) AS attachments
    FROM action_logs l
    LEFT JOIN action_attachments a ON l.id = a.action_id
    ${whereClause}
    GROUP BY l.id
    ORDER BY l.start_time DESC, l.recorded_at DESC;
  `;

  const res = await queryDb(query, queryParams);
  return res.rows.map((row) => {
    let dur = row.duration || '';
    if (!dur && row.startTime && row.endTime && row.startTime !== row.endTime) {
      dur = calculateDurationBetween(row.startTime, row.endTime);
    }
    return {
      ...row,
      duration: dur,
      displayTime: new Date(row.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      displayDate: new Date(row.startTime).toLocaleDateString(),
      timestamp: row.startTime,
    };
  });
}


/**
 * Save log entry to PostgreSQL database
 */
export async function saveDbLogEntry(logData, attachments = []) {
  const client = await getPoolClient();
  try {
    await client.query('BEGIN');

    const id = logData.id || 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const category = logData.category || 'other';
    const subCategory = logData.subCategory || 'other';
    
    const nowIso = new Date().toISOString();
    const startTime = logData.startTime || logData.timestamp || nowIso;

    let duration = logData.duration || '';
    let endTime = logData.endTime;

    if (!endTime && duration) {
      endTime = calculateEndTimeFromDuration(startTime, duration);
    } else if (!endTime) {
      endTime = startTime;
    }

    if (!duration && startTime && endTime && startTime !== endTime) {
      duration = calculateDurationBetween(startTime, endTime);
    }

    if (category === 'diaper' || category === 'health') {
      endTime = startTime;
      duration = '';
    }


    const recordedAt = logData.recordedAt || nowIso;
    const amount = logData.amount || '';
    const summaryEn = logData.summaryEn || '';
    const originalZh = logData.originalZh || '';
    const notes = logData.notes || '';

    const insertLogQuery = `
      INSERT INTO action_logs (
        id, category, sub_category, start_time, end_time, recorded_at,
        amount, duration, summary_en, original_zh, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    await client.query(insertLogQuery, [
      id, category, subCategory, startTime, endTime, recordedAt,
      amount, duration, summaryEn, originalZh, notes,
    ]);

    const savedAttachments = [];
    if (attachments && attachments.length > 0) {
      const insertAttQuery = `
        INSERT INTO action_attachments (action_id, file_name, file_path, mime_type, file_size, caption)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;

      for (const att of attachments) {
        const attRes = await client.query(insertAttQuery, [
          id, att.fileName, att.filePath, att.mimeType, att.fileSize, att.caption || null,
        ]);
        const row = attRes.rows[0];
        savedAttachments.push({
          id: row.id,
          fileName: row.file_name,
          filePath: row.file_path,
          url: '/uploads/' + row.file_name,
          mimeType: row.mime_type,
          fileSize: row.file_size,
          caption: row.caption,
          uploadedAt: row.uploaded_at,
        });
      }
    }

    await client.query('COMMIT');

    return {
      id,
      category,
      subCategory,
      startTime,
      endTime,
      recordedAt,
      timestamp: startTime,
      displayTime: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      displayDate: new Date(startTime).toLocaleDateString(),
      amount,
      duration,
      summaryEn,
      originalZh,
      notes,
      attachments: savedAttachments,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update an existing log entry in PostgreSQL database
 */
export async function updateDbLogEntry(id, logData, newAttachments = [], removedAttachmentIds = []) {
  const client = await getPoolClient();
  try {
    await client.query('BEGIN');

    const category = logData.category || 'other';
    const subCategory = logData.subCategory || 'other';
    const startTime = logData.startTime || logData.timestamp || new Date().toISOString();

    let duration = logData.duration || '';
    let endTime = logData.endTime;

    if (!endTime && duration) {
      endTime = calculateEndTimeFromDuration(startTime, duration);
    } else if (!endTime) {
      endTime = startTime;
    }

    if (!duration && startTime && endTime && startTime !== endTime) {
      duration = calculateDurationBetween(startTime, endTime);
    }

    if (category === 'diaper' || category === 'health') {
      endTime = startTime;
      duration = '';
    }


    const amount = logData.amount || '';
    const summaryEn = logData.summaryEn || '';
    const originalZh = logData.originalZh || '';
    const notes = logData.notes || '';

    const updateLogQuery = `
      UPDATE action_logs
      SET category = $1,
          sub_category = $2,
          start_time = $3,
          end_time = $4,
          amount = $5,
          duration = $6,
          summary_en = $7,
          original_zh = $8,
          notes = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;

    const res = await client.query(updateLogQuery, [
      category, subCategory, startTime, endTime,
      amount, duration, summaryEn, originalZh, notes, id
    ]);

    if (res.rows.length === 0) {
      throw new Error(`Log entry not found: ${id}`);
    }

    // Handle removed attachments
    if (removedAttachmentIds && removedAttachmentIds.length > 0) {
      const selectRemQuery = `SELECT file_path FROM action_attachments WHERE action_id = $1 AND id = ANY($2::int[])`;
      const remRes = await client.query(selectRemQuery, [id, removedAttachmentIds.map((val) => parseInt(val, 10))]);
      for (const row of remRes.rows) {
        if (row.file_path && fs.existsSync(row.file_path)) {
          try {
            fs.unlinkSync(row.file_path);
          } catch (e) {
            console.warn('Failed to delete removed attachment file:', row.file_path, e.message);
          }
        }
      }

      await client.query(`DELETE FROM action_attachments WHERE action_id = $1 AND id = ANY($2::int[])`, [id, removedAttachmentIds.map((val) => parseInt(val, 10))]);
    }

    // Handle newly added attachments
    if (newAttachments && newAttachments.length > 0) {
      const insertAttQuery = `
        INSERT INTO action_attachments (action_id, file_name, file_path, mime_type, file_size, caption)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      for (const att of newAttachments) {
        await client.query(insertAttQuery, [
          id, att.fileName, att.filePath, att.mimeType, att.fileSize, att.caption || null,
        ]);
      }
    }

    // Fetch all current attachments for this action_id
    const attRes = await client.query(
      `SELECT id, file_name, file_path, mime_type, file_size, caption, uploaded_at FROM action_attachments WHERE action_id = $1 ORDER BY id ASC`,
      [id]
    );

    const attachments = attRes.rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      url: '/uploads/' + row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      caption: row.caption,
      uploadedAt: row.uploaded_at,
    }));

    await client.query('COMMIT');

    const updatedRow = res.rows[0];

    return {
      id,
      category: updatedRow.category,
      subCategory: updatedRow.sub_category,
      startTime: updatedRow.start_time,
      endTime: updatedRow.end_time,
      recordedAt: updatedRow.recorded_at,
      timestamp: updatedRow.start_time,
      displayTime: new Date(updatedRow.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      displayDate: new Date(updatedRow.start_time).toLocaleDateString(),
      amount: updatedRow.amount,
      duration: updatedRow.duration,
      summaryEn: updatedRow.summary_en,
      originalZh: updatedRow.original_zh,
      notes: updatedRow.notes,
      attachments,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


/**
 * Delete log entry and linked files from PostgreSQL database
 */
export async function deleteDbLogEntry(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get attachment file paths first
    const attRes = await client.query('SELECT file_path FROM action_attachments WHERE action_id = $1', [id]);
    for (const row of attRes.rows) {
      if (row.file_path && fs.existsSync(row.file_path)) {
        try {
          fs.unlinkSync(row.file_path);
        } catch (e) {
          console.warn('Failed to delete file from disk:', row.file_path, e.message);
        }
      }
    }

    // Delete log (cascades to action_attachments table)
    await client.query('DELETE FROM action_logs WHERE id = $1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get current timers state from PostgreSQL DB
 */
export async function getDbTimersState() {
  const now = new Date();

  // 1. Feeding Session state
  const sessionRes = await queryDb("SELECT id, status, start_time AS \"startTime\", end_time AS \"endTime\", expires_at AS \"expiresAt\" FROM feeding_timers WHERE id = 'active_session'");
  let feedingSession = sessionRes.rows[0] || { id: 'active_session', status: 'idle', startTime: null, endTime: null, expiresAt: null };

  // Check if session in 'active' state has expired (>1hr)
  if (feedingSession.status === 'active' && feedingSession.expiresAt) {
    const expiresAtDate = new Date(feedingSession.expiresAt);
    if (now >= expiresAtDate) {
      // Transition automatically to 'ended' with reason 'expired'
      const updateRes = await queryDb(
        `UPDATE feeding_timers 
         SET status = 'ended', end_time = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = 'active_session' 
         RETURNING id, status, start_time AS "startTime", end_time AS "endTime", expires_at AS "expiresAt"`,
        [feedingSession.expiresAt]
      );
      feedingSession = updateRes.rows[0];
      feedingSession.reason = 'expired';
    }
  }

  // 2. Opened RTF Bottles
  const bottlesRes = await queryDb(
    `SELECT id, bottle_type AS "bottleType", opened_at AS "openedAt", expires_at AS "expiresAt", created_at AS "createdAt"
     FROM opened_formula_bottles
     ORDER BY created_at DESC`
  );

  return {
    feedingSession,
    openedBottles: bottlesRes.rows || [],
  };
}

/**
 * Start a 1-hour feeding session in PostgreSQL DB
 */
export async function startDbFeedingSession() {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  const res = await queryDb(
    `INSERT INTO feeding_timers (id, status, start_time, end_time, expires_at, updated_at)
     VALUES ('active_session', 'active', $1, NULL, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE 
     SET status = 'active', start_time = $1, end_time = NULL, expires_at = $2, updated_at = CURRENT_TIMESTAMP
     RETURNING id, status, start_time AS "startTime", end_time AS "endTime", expires_at AS "expiresAt"`,
    [now.toISOString(), expiresAt.toISOString()]
  );

  return res.rows[0];
}

/**
 * Stop an active feeding session in PostgreSQL DB
 */
export async function stopDbFeedingSession() {
  const now = new Date();

  const res = await queryDb(
    `UPDATE feeding_timers 
     SET status = 'ended', end_time = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = 'active_session' 
     RETURNING id, status, start_time AS "startTime", end_time AS "endTime", expires_at AS "expiresAt"`,
    [now.toISOString()]
  );

  return res.rows[0] || { id: 'active_session', status: 'ended', startTime: now.toISOString(), endTime: now.toISOString() };
}

/**
 * Reset feeding session to IDLE in PostgreSQL DB
 */
export async function resetDbFeedingSession() {
  const res = await queryDb(
    `INSERT INTO feeding_timers (id, status, start_time, end_time, expires_at, updated_at)
     VALUES ('active_session', 'idle', NULL, NULL, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE 
     SET status = 'idle', start_time = NULL, end_time = NULL, expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     RETURNING id, status, start_time AS "startTime", end_time AS "endTime", expires_at AS "expiresAt"`
  );

  return res.rows[0];
}

/**
 * Open a Ready-To-Feed formula bottle in PostgreSQL DB
 */
export async function openDbFormulaBottle(bottleType) {
  // Check count of active opened bottles (max 5)
  const countRes = await queryDb('SELECT COUNT(*) FROM opened_formula_bottles');
  const count = parseInt(countRes.rows[0].count, 10);
  if (count >= 5) {
    throw new Error('Maximum limit of 5 opened bottles reached.');
  }

  const now = new Date();
  const hoursToAdd = bottleType === '237ml' ? 48 : 24;
  const expiresAt = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  const id = 'rtf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  const res = await queryDb(
    `INSERT INTO opened_formula_bottles (id, bottle_type, opened_at, expires_at, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING id, bottle_type AS "bottleType", opened_at AS "openedAt", expires_at AS "expiresAt", created_at AS "createdAt"`,
    [id, bottleType, now.toISOString(), expiresAt.toISOString()]
  );

  return res.rows[0];
}

/**
 * Finish/discard an opened Ready-To-Feed bottle in PostgreSQL DB
 */
export async function finishDbFormulaBottle(id) {
  await queryDb('DELETE FROM opened_formula_bottles WHERE id = $1', [id]);
  return true;
}

export default pool;

