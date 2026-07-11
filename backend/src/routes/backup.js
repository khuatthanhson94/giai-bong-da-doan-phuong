import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { dbPath, reopenDatabase, logAction } from '../db.js';
import { authRequired, requireRole, ROLES } from '../middleware/auth.js';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' });
const adminOnly = [authRequired, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

const backupsDir = path.join(path.dirname(dbPath), 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Helper to run auto-backup rotation
export function performAutoBackup() {
  try {
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `backup-${dateStr}.db`);
    
    // Copy active database
    fs.copyFileSync(dbPath, backupFile);
    console.log(`[Backup] Automatic backup created: ${backupFile}`);

    // Prune backups if count > 5
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, path: path.join(backupsDir, f), stat: fs.statSync(path.join(backupsDir, f)) }))
      .sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());

    while (files.length > 5) {
      const oldest = files.shift();
      fs.unlinkSync(oldest.path);
      console.log(`[Backup] Pruned oldest backup file: ${oldest.name}`);
    }
  } catch (err) {
    console.error('[Backup] Automatic backup failed:', err);
  }
}

// GET: list available auto backups
router.get('/list', adminOnly, (req, res) => {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(backupsDir, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          size: stat.size,
          created_at: stat.mtime
        };
      })
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: download active database
router.get('/download', adminOnly, (req, res) => {
  try {
    res.download(dbPath, 'tournament.db');
    logAction(req.user.username, 'DOWNLOAD_BACKUP', 'Tải về tệp cơ sở dữ liệu tournament.db');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: create a manual backup point
router.post('/create', adminOnly, (req, res) => {
  try {
    performAutoBackup();
    logAction(req.user.username, 'CREATE_BACKUP', 'Khởi tạo điểm khôi phục cơ sở dữ liệu thủ công');
    res.json({ message: 'Tạo bản sao lưu thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: restore from uploaded .db file
router.post('/restore', adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy tệp tải lên' });
  }

  const tempPath = req.file.path;
  try {
    // Basic verification: Check if file header starts with SQLite format
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(tempPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (buffer.toString('utf-8', 0, 15) !== 'SQLite format 3') {
      fs.unlinkSync(tempPath);
      return res.status(400).json({ error: 'Tệp tải lên không phải là cơ sở dữ liệu SQLite hợp lệ' });
    }

    // 1. Close current connection proxy
    reopenDatabase(tempPath); 
    
    // 2. Log action and notify success
    logAction(req.user.username, 'RESTORE_DATABASE_UPLOAD', 'Khôi phục cơ sở dữ liệu thành công từ tệp tải lên');
    res.json({ message: 'Khôi phục hệ thống thành công' });
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: 'Khôi phục thất bại: ' + err.message });
  }
});

// POST: restore from historical backup file
router.post('/restore-file', adminOnly, (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Thiếu tên tệp khôi phục' });

  const targetPath = path.join(backupsDir, filename);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Không tìm thấy bản sao lưu này' });
  }

  try {
    // Reuse reopenDatabase to close old active connection and replace dbPath
    reopenDatabase(targetPath);

    logAction(req.user.username, 'RESTORE_DATABASE_FILE', `Khôi phục cơ sở dữ liệu thành công từ tệp lưu trữ: ${filename}`);
    res.json({ message: 'Khôi phục hệ thống thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Khôi phục thất bại: ' + err.message });
  }
});

export default router;
