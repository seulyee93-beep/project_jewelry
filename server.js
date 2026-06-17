import 'dotenv/config';
import express from 'express';
import { createClient } from '@libsql/client';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, PORT = 3000 } = process.env;

if (!TURSO_DATABASE_URL) {
  console.error('Missing TURSO_DATABASE_URL environment variable.');
  process.exit(1);
}

const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// Ensure the consultations table exists on startup.
await db.execute(`
  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();
app.use(express.json());

// Save a consultation request from the landing-page form.
app.post('/api/consult', async (req, res) => {
  const { name, phone, email = '', message = '' } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: '성함과 연락처는 필수입니다.' });
  }
  try {
    await db.execute({
      sql: 'INSERT INTO consultations (name, phone, email, message) VALUES (?, ?, ?, ?)',
      args: [String(name).trim(), String(phone).trim(), String(email).trim(), String(message).trim()],
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save consultation:', err);
    res.status(500).json({ ok: false, error: '저장 중 오류가 발생했습니다.' });
  }
});

// Serve the static landing page and assets.
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Jewelry Card running on port ${PORT}`);
});
