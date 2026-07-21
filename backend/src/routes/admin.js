import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db, logAction, uploadDir } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { isConfigured as isCloudinaryConfigured, uploadToCloudinary } from '../services/cloudinary.js';

const router = Router();
const adminOnly = [authRequired, requireRole('admin', 'super_admin')];

/**
 * POST /api/admin/migrate-uploads
 * Scan /uploads directory, upload each local file to Cloudinary,
 * then update all database URL references to use the new Cloudinary URL.
 *
 * This endpoint is idempotent: files already on Cloudinary (res.cloudinary.com)
 * are skipped automatically.
 */
router.post('/migrate-uploads', adminOnly, async (req, res) => {
  if (!isCloudinaryConfigured) {
    return res.status(400).json({ error: 'Cloudinary chưa được cấu hình. Kiểm tra lại credentials.' });
  }

  const results = {
    scanned: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    dbUpdated: 0,
    errors: [],
  };

  // Helper: tables and columns that store local image URLs
  const IMAGE_FIELDS = [
    { table: 'teams',       col: 'logo' },
    { table: 'teams',       col: 'image' },
    { table: 'players',     col: 'photo' },
    { table: 'news',        col: 'image' },
    { table: 'gallery',     col: 'image_url' },
    { table: 'sponsors',    col: 'logo' },
    { table: 'seasons',     col: 'logo' },
    { table: 'seasons',     col: 'banner' },
    { table: 'tournaments', col: 'logo' },
    { table: 'tournaments', col: 'banner' },
  ];

  // Collect all local /uploads URLs currently in the database
  const localUrlMap = new Map(); // localUrl -> cloudinaryUrl (filled after upload)

  for (const { table, col } of IMAGE_FIELDS) {
    try {
      const rows = db.prepare(
        `SELECT id, ${col} FROM ${table} WHERE ${col} IS NOT NULL AND ${col} != '' AND ${col} NOT LIKE 'https://res.cloudinary.com%'`
      ).all();
      for (const row of rows) {
        if (row[col] && !localUrlMap.has(row[col])) {
          localUrlMap.set(row[col], null); // placeholder
        }
      }
    } catch (e) {
      // table may not have column yet; skip silently
    }
  }

  // Also scan settings table for image keys
  try {
    const imageKeys = ['union_logo', 'banner_image', 'tournament_logo'];
    for (const key of imageKeys) {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
      if (row && row.value && !row.value.startsWith('https://res.cloudinary.com')) {
        if (!localUrlMap.has(row.value)) localUrlMap.set(row.value, null);
      }
    }
  } catch (e) { /* ignore */ }

  results.scanned = localUrlMap.size;

  // Upload each local file to Cloudinary
  for (const [localUrl, _] of localUrlMap) {
    // Derive local file path from URL
    // URLs look like: /uploads/filename.jpg or https://...onrender.com/uploads/filename.jpg
    let filename = localUrl;
    if (filename.includes('/uploads/')) {
      filename = filename.split('/uploads/')[1];
    }
    filename = filename.split('?')[0]; // strip query params

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      results.skipped++;
      results.errors.push(`File not found on disk: ${filename}`);
      continue;
    }

    try {
      const { url } = await uploadToCloudinary(filePath, filename);
      localUrlMap.set(localUrl, url);
      results.uploaded++;
    } catch (err) {
      results.failed++;
      results.errors.push(`Upload failed for ${filename}: ${err.message}`);
    }
  }

  // Update all database references
  for (const { table, col } of IMAGE_FIELDS) {
    try {
      const rows = db.prepare(
        `SELECT id, ${col} FROM ${table} WHERE ${col} IS NOT NULL AND ${col} != '' AND ${col} NOT LIKE 'https://res.cloudinary.com%'`
      ).all();

      for (const row of rows) {
        const cloudinaryUrl = localUrlMap.get(row[col]);
        if (cloudinaryUrl) {
          db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`).run(cloudinaryUrl, row.id);
          results.dbUpdated++;
        }
      }
    } catch (e) {
      // ignore missing column errors
    }
  }

  // Update settings table image values
  try {
    const imageKeys = ['union_logo', 'banner_image', 'tournament_logo'];
    for (const key of imageKeys) {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
      if (row && row.value) {
        const cloudinaryUrl = localUrlMap.get(row.value);
        if (cloudinaryUrl) {
          db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(cloudinaryUrl, key);
          results.dbUpdated++;
        }
      }
    }
  } catch (e) { /* ignore */ }

  logAction(
    req.user.username,
    'MIGRATE_UPLOADS_TO_CLOUDINARY',
    `Migrated ${results.uploaded}/${results.scanned} files. DB records updated: ${results.dbUpdated}. Failed: ${results.failed}.`
  );

  res.json({
    success: true,
    message: `Đã upload ${results.uploaded}/${results.scanned} ảnh lên Cloudinary. Cập nhật ${results.dbUpdated} bản ghi trong database.`,
    results,
  });
});

/**
 * GET /api/admin/migrate-uploads/status
 * Check if Cloudinary is configured and how many local images remain in DB
 */
router.get('/migrate-uploads/status', adminOnly, (req, res) => {
  if (!isCloudinaryConfigured) {
    return res.json({ cloudinaryConfigured: false, localImagesCount: 0 });
  }

  const IMAGE_FIELDS = [
    { table: 'teams',       col: 'logo' },
    { table: 'teams',       col: 'image' },
    { table: 'players',     col: 'photo' },
    { table: 'news',        col: 'image' },
    { table: 'gallery',     col: 'image_url' },
    { table: 'sponsors',    col: 'logo' },
    { table: 'seasons',     col: 'logo' },
    { table: 'seasons',     col: 'banner' },
    { table: 'tournaments', col: 'logo' },
    { table: 'tournaments', col: 'banner' },
  ];

  let localImagesCount = 0;
  for (const { table, col } of IMAGE_FIELDS) {
    try {
      const row = db.prepare(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${col} IS NOT NULL AND ${col} != '' AND ${col} NOT LIKE 'https://res.cloudinary.com%'`
      ).get();
      localImagesCount += row?.c || 0;
    } catch (e) { /* ignore */ }
  }

  res.json({ cloudinaryConfigured: true, localImagesCount });
});

export default router;
