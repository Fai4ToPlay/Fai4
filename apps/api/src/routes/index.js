import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';
import {
  listContractors,
  createContractor,
  updateContractor,
  deleteContractor
} from '../controllers/contractors.controller.js';
import {
  listActs,
  createAct,
  getAct,
  updateAct,
  deleteAct,
  exportActPdf,
  exportActExcel
} from '../controllers/acts.controller.js';
import {
  uploadExcelMiddleware,
  importExcelTemplate,
  listAuditLogs,
  cleanupUploads
} from '../controllers/system.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

export const router = Router();

router.post('/auth/login', login);

router.get('/contractors', authRequired, listContractors);
router.post('/contractors', authRequired, createContractor);
router.put('/contractors/:id', authRequired, updateContractor);
router.delete('/contractors/:id', authRequired, roleRequired('admin'), deleteContractor);

router.get('/acts', authRequired, listActs);
router.post('/acts', authRequired, createAct);
router.get('/acts/:id', authRequired, getAct);
router.put('/acts/:id', authRequired, updateAct);
router.delete('/acts/:id', authRequired, roleRequired('admin'), deleteAct);
router.get('/acts/:id/export/pdf', authRequired, exportActPdf);
router.get('/acts/:id/export/excel', authRequired, exportActExcel);

router.post('/system/import/excel', authRequired, roleRequired('admin'), uploadExcelMiddleware, importExcelTemplate);
router.get('/system/audit-logs', authRequired, roleRequired('admin'), listAuditLogs);
router.post('/system/cleanup-uploads', authRequired, roleRequired('admin'), cleanupUploads);
