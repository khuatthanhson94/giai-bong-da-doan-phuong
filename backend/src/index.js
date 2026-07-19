process.env.TZ = 'Asia/Ho_Chi_Minh';
import express from 'express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDatabase, uploadDir } from './db.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import playerRoutes from './routes/players.js';
import matchRoutes from './routes/matches.js';
import newsRoutes from './routes/news.js';
import galleryRoutes from './routes/gallery.js';
import publicRoutes from './routes/public.js';
import groupsRoutes from './routes/groups.js';
import sponsorsRoutes from './routes/sponsors.js';
import seasonsRoutes from './routes/seasons.js';
import tournamentsRoutes from './routes/tournaments.js';
import recyclebinRoutes from './routes/recyclebin.js';
import aiRoutes from './routes/ai.js';
import backupRoutes from './routes/backup.js';
import { requestStorage } from './utils/context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3004;

initDatabase();

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
app.use((req, res, next) => {
  requestStorage.run(req, () => {
    next();
  });
});
app.use('/uploads', express.static(uploadDir));

// Fallback for static files on ephemeral serverless environment (Vercel)
// Redirect requests for missing files to the persistent Render backend
if (process.env.VERCEL) {
  app.use('/uploads/:filename', (req, res) => {
    const renderBackend = 'https://giai-bong-da-api-v2.onrender.com';
    res.redirect(`${renderBackend}/uploads/${req.params.filename}`);
  });
}

import { backupUpload } from './services/sync.js';
import { isConfigured as isCloudinaryConfigured, uploadToCloudinary } from './services/cloudinary.js';

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  
  if (isCloudinaryConfigured) {
    try {
      console.log(`[Cloudinary] Uploading file ${req.file.filename} to Cloudinary...`);
      const result = await uploadToCloudinary(req.file.path, req.file.filename);
      // Clean up the local temp file from multer since it is now safely stored on Cloudinary
      try {
        fs.unlinkSync(req.file.path);
        console.log(`[Cloudinary] Deleted local temp file: ${req.file.path}`);
      } catch (err) {
        console.error('[Cloudinary] Failed to delete local temp file:', err.message);
      }
      return res.json({ url: result.url });
    } catch (err) {
      console.error('[Cloudinary] Upload failed, falling back to local storage & Postgres backup:', err.message);
    }
  }

  // Backup upload to Postgres in background
  backupUpload(req.file.filename, req.file.path).catch((err) => {
    console.error('[Sync] Background upload backup error:', err.message);
  });

  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/sponsors', sponsorsRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/recyclebin', recyclebinRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api', publicRoutes);

// Debug endpoint to list uploaded files (for development)
app.get('/api/debug/uploads', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
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

  const { getSyncStatus } = await import('./services/sync.js');
  const syncStatus = getSyncStatus();

  res.json({
    configured: true,
    maskedUrl: url.replace(/:([^:@]+)@/, ':****@'),
    connectionStatus,
    syncStatus,
    localDb: {
      path: dbPathDebug,
      exists: localExists,
      sizeBytes: localSize
    },
    cloudDb: cloudDbInfo,
    error
  });
});

app.get('/api/debug/cloud-uploads', async (req, res) => {
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) {
    return res.json({ configured: false, count: 0, files: [] });
  }

  try {
    const pg = await import('pg');
    const client = new pg.default.Client({ connectionString: url });
    await client.connect();

    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'uploaded_files'
        );
      `);
      
      const hasTable = tableCheck.rows[0].exists;
      if (!hasTable) {
        return res.json({ configured: true, count: 0, message: 'uploaded_files table does not exist yet.', files: [] });
      }

      const dbRes = await client.query("SELECT filename, length(data) as size_bytes, mime_type, created_at FROM uploaded_files");
      res.json({
        configured: true,
        count: dbRes.rows.length,
        files: dbRes.rows
      });
    } finally {
      await client.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.get('/api/debug/raw-db-url', (req, res) => {
  res.json({ url: process.env.SYNC_DATABASE_URL || 'not set' });
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

