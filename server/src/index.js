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

const uploadDir = process.env.VERCEL 
  ? '/tmp/uploads' 
  : path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Copy pre-existing uploads if on Vercel and they don't exist in /tmp
if (process.env.VERCEL) {
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
      console.log('Copied upload templates to /tmp/uploads');
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

// Fallback for static files on ephemeral serverless environment (Vercel)
// Redirect requests for missing files to the persistent Render backend
app.use('/uploads/:filename', (req, res) => {
  const renderBackend = 'https://giai-bong-da-doan-phuong-backend.onrender.com';
  res.redirect(`${renderBackend}/uploads/${req.params.filename}`);
});

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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
