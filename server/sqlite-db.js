import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqlInstance = null;
let db = null;
let saveTimeout = null;

const dbPath = process.env.DB_PATH || (process.env.VERCEL ? '/tmp/vibetracker.db' : path.join(__dirname, 'vibetracker.db'));

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (db) {
        const data = db.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
      }
    } catch (e) {
      console.warn('Failed to persist sqlite db:', e.message);
    }
  }, 100);
}

export async function getDb() {
  if (db) return db;

  if (!sqlInstance) {
    sqlInstance = await initSqlJs();
  }

  if (fs.existsSync(dbPath) && process.env.DB_RESET_ON_BOOT !== 'true') {
    try {
      const buffer = fs.readFileSync(dbPath);
      db = new sqlInstance.Database(buffer);
    } catch (err) {
      console.warn('Could not read existing SQLite DB, creating fresh:', err.message);
      db = new sqlInstance.Database();
    }
  } else {
    db = new sqlInstance.Database();
  }

  // Register MySQL compatible NOW()
  db.create_function('NOW', () => new Date().toISOString().replace('T', ' ').slice(0, 19));

  return db;
}

export function translateQuery(rawSql, rawParams = []) {
  let sql = rawSql.trim();
  let params = Array.isArray(rawParams) ? [...rawParams] : (rawParams !== undefined ? [rawParams] : []);

  // 1. Convert MySQL Foreign Key Checks to SQLite Pragma
  if (/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*0/i.test(sql)) {
    return { sql: 'PRAGMA foreign_keys = OFF;', params: [] };
  }
  if (/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*1/i.test(sql)) {
    return { sql: 'PRAGMA foreign_keys = ON;', params: [] };
  }

  // 2. Convert INSERT IGNORE INTO -> INSERT OR IGNORE INTO
  sql = sql.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT OR IGNORE INTO');

  // 3. Handle "INSERT INTO table SET ?"
  const insertSetMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s+SET\s+\?/i);
  if (insertSetMatch && params.length >= 1 && typeof params[0] === 'object' && params[0] !== null) {
    const table = insertSetMatch[1];
    const obj = params.shift();
    const keys = Object.keys(obj);
    const placeholders = keys.map(() => '?').join(', ');
    const cols = keys.map(k => `\`${k}\``).join(', ');
    sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
    params.unshift(...Object.values(obj));
  }

  // 4. Handle "UPDATE table SET ? WHERE ..."
  const updateSetMatch = sql.match(/(UPDATE\s+[a-zA-Z0-9_]+\s+)SET\s+\?(\s+WHERE\s+.*)/i);
  if (updateSetMatch && params.length >= 1 && typeof params[0] === 'object' && params[0] !== null) {
    const prefix = updateSetMatch[1];
    const suffix = updateSetMatch[2];
    const obj = params.shift();
    const setClause = Object.keys(obj).map(k => `\`${k}\` = ?`).join(', ');
    sql = `${prefix}SET ${setClause}${suffix}`;
    params.unshift(...Object.values(obj));
  }

  return { sql, params };
}

export async function executeQuery(rawSql, rawParams = []) {
  const database = await getDb();
  const { sql, params } = translateQuery(rawSql, rawParams);

  const trimmed = sql.trim();
  const isSelect = /^(SELECT|PRAGMA|SHOW|EXPLAIN)\b/i.test(trimmed);

  if (isSelect) {
    const stmt = database.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return [rows, []];
    } finally {
      stmt.free();
    }
  } else {
    // Execute multiple statements if separated by semicolon and no params
    if (sql.includes(';') && params.length === 0) {
      database.run(sql);
      scheduleSave();
      return [{ affectedRows: 0, insertId: 0 }, []];
    }

    database.run(sql, params);
    scheduleSave();
    const changesRes = database.exec('SELECT changes() AS affectedRows, last_insert_rowid() AS insertId');
    const affected = changesRes[0]?.values[0]?.[0] || 0;
    const insertId = changesRes[0]?.values[0]?.[1] || 0;
    return [{ affectedRows: affected, insertId }, []];
  }
}

export const sqlitePool = {
  async query(sql, params) {
    return executeQuery(sql, params);
  },
  async getConnection() {
    return {
      async query(sql, params) {
        return executeQuery(sql, params);
      },
      async beginTransaction() {
        await executeQuery('BEGIN TRANSACTION');
      },
      async commit() {
        await executeQuery('COMMIT');
      },
      async rollback() {
        try {
          await executeQuery('ROLLBACK');
        } catch (_) {}
      },
      release() {},
    };
  },
  async end() {
    if (db) {
      try {
        const data = db.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
      } catch (_) {}
    }
  }
};
