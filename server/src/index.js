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

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
