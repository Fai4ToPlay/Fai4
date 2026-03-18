import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { analyzeExcelTemplate } from '../services/excel.service.js';
import { query } from '../config/db.js';

const upload = multer({ dest: 'uploads/' });
export const uploadExcelMiddleware = upload.single('file');

export async function importExcelTemplate(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
  const fullPath = path.resolve(req.file.path);
  const meta = await analyzeExcelTemplate(fullPath);
  await query(
    'INSERT INTO excel_templates(name, file_path, sheets_meta) VALUES ($1,$2,$3)',
    [req.file.originalname, fullPath, JSON.stringify(meta.sheets)]
  );
  return res.json(meta);
}

export async function listAuditLogs(req, res) {
  const result = await query(
    `SELECT a.*, u.full_name as actor_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC
     LIMIT 200`
  );
  res.json(result.rows);
}

export async function cleanupUploads(req, res) {
  await fs.rm('uploads', { recursive: true, force: true });
  return res.json({ ok: true });
}
