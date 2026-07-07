import express from 'express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import playerRoutes from './routes/players.js';
import matchRoutes from './routes/matches.js';
import newsRoutes from './routes/news.js';
import galleryRoutes from './routes/gallery.js';
import publicRoutes from './routes/public.js';
import groupsRoutes from './routes/groups.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3004;

initDatabase();

let uploadDir;
if (process.env.VERCEL) {
  uploadDir = '/tmp/uploads';
} else if (process.env.RENDER) {
  uploadDir = '/opt/render/project/backend/data/uploads';
} else {
  uploadDir = path.join(__dirname, '..', 'uploads');
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Copy pre-existing uploads if they don't exist in destination folder (for Vercel and Render persistent disk)
if (process.env.VERCEL || process.env.RENDER) {
  const templateUploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(templateUploadsDir)) {
    try {
      const files = fs.readdirSync(templateUploadsDir);
      for (const file of files) {
        const src = path.join(templateUploadsDir, file);
        const dest = path.join(uploadDir, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
      console.log(`Copied upload templates to ${uploadDir}`);
    } catch (e) {
      console.error('Failed to copy upload templates:', e);
    }
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/\.vercel\.app$/i.test(origin)) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

// Fallback for static files on ephemeral serverless environment (Vercel)
// Redirect requests for missing files to the persistent Render backend
if (process.env.VERCEL) {
  app.use('/uploads/:filename', (req, res) => {
    const renderBackend = 'https://giai-bong-da-doan-phuong-backend.onrender.com';
    res.redirect(`${renderBackend}/uploads/${req.params.filename}`);
  });
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api', publicRoutes);

// Debug endpoint to list uploaded files (for development)
app.get('/api/debug/uploads', (req, res) => {
  const dir = path.join(__dirname, '..', 'uploads');
  fs.readdir(dir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ files });
  });
});

app.get('/api/debug/sync', async (req, res) => {
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) {
    return res.json({
      configured: false,
      message: 'SYNC_DATABASE_URL is not set on Render dashboard environment variables.'
    });
  }

  const { dbPath } = await import('./db.js');
  const localExists = fs.existsSync(dbPath);
  const localSize = localExists ? fs.statSync(dbPath).size : 0;

  let dbPathDebug = dbPath;
  let connectionStatus = 'unknown';
  let cloudDbInfo = null;
  let error = null;

  try {
    const pg = await import('pg');
    const client = new pg.default.Client({ connectionString: url });
    await client.connect();
    connectionStatus = 'connected';

    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sqlite_sync'
        );
      `);
      
      const hasTable = tableCheck.rows[0].exists;
      if (hasTable) {
        const metadata = await client.query('SELECT LENGTH(data) as size, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
        if (metadata.rows.length > 0) {
          cloudDbInfo = {
            found: true,
            sizeBytes: parseInt(metadata.rows[0].size),
            updatedAt: metadata.rows[0].updated_at
          };
        } else {
          cloudDbInfo = { found: false, message: 'Table exists but tournament.db key not found.' };
        }
      } else {
        cloudDbInfo = { found: false, message: 'sqlite_sync table does not exist.' };
      }
    } finally {
      await client.end();
    }
  } catch (err) {
    connectionStatus = 'failed';
    error = err.message;
  }

  res.json({
    configured: true,
    maskedUrl: url.replace(/:([^:@]+)@/, ':****@'),
    connectionStatus,
    localDb: {
      path: dbPathDebug,
      exists: localExists,
      sizeBytes: localSize
    },
    cloudDb: cloudDbInfo,
    error
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Admin endpoint to restore database from uploaded file (for initial setup)
app.post('/api/admin/restore-database', upload.single('database'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file database' });
  
  try {
    const { dbPath } = await import('./db.js');
    
    // Copy uploaded database to replace current one
    fs.copyFileSync(req.file.path, dbPath);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Sync to cloud backup immediately
    try {
      const { backupDatabase } = await import('./services/sync.js');
      await backupDatabase(dbPath);
    } catch (syncErr) {
      console.error('[Sync] Failed to sync to cloud after restore:', syncErr.message);
    }
    
    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

    // Keep-alive: tự ping mỗi 14 phút để Render free tier không sleep
    if (process.env.RENDER) {
      const KEEP_ALIVE_URL = `https://giai-bong-da-doan-phuong-backend.onrender.com/api/health`;
      setInterval(async () => {
        try {
          const res = await fetch(KEEP_ALIVE_URL);
          console.log(`[keep-alive] ping OK: ${res.status}`);
        } catch (e) {
          console.warn(`[keep-alive] ping failed: ${e.message}`);
        }
      }, 14 * 60 * 1000); // 14 phút
      console.log('[keep-alive] Self-ping enabled (every 14 minutes)');
    }
  });
}

export default app;

