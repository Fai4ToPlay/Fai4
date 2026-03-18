import { query } from '../config/db.js';
import { addAudit } from '../utils/audit.js';
import { exportActToExcel } from '../services/excel.service.js';
import { renderActPdf } from '../services/pdf.service.js';

function addThreeDays(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export async function listActs(req, res) {
  const { type, status, search } = req.query;
  const params = [];
  const where = [];
  if (type) {
    params.push(type);
    where.push(`a.act_type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`a.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(a.act_number ILIKE $${params.length} OR a.object_name ILIKE $${params.length})`);
  }

  const sql = `SELECT a.*, c.org_name as contractor_name
               FROM acts a
               LEFT JOIN contractors c ON c.id = a.contractor_id
               ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY a.created_at DESC`;
  const result = await query(sql, params);
  res.json(result.rows);
}

export async function createAct(req, res) {
  const data = req.body;
  const due = ['act_detected_3d', 'equipment_defect_3d'].includes(data.act_type)
    ? addThreeDays(data.act_date)
    : data.due_date || null;

  const result = await query(
    `INSERT INTO acts(
      act_number, act_type, status, title, object_name, object_address, act_date, due_date,
      representative_position, representative_last_name, commission_position, commission_last_name,
      contractor_id, source_act_id, created_by, updated_by, form_payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15,$16)
    RETURNING *`,
    [
      data.act_number,
      data.act_type,
      data.status || 'draft',
      data.title,
      data.object_name,
      data.object_address,
      data.act_date,
      due,
      data.representative_position,
      data.representative_last_name,
      data.commission_position,
      data.commission_last_name,
      data.contractor_id || null,
      data.source_act_id || null,
      req.user.id,
      data.form_payload || {}
    ]
  );
  const act = result.rows[0];

  if (Array.isArray(data.defects)) {
    await Promise.all(
      data.defects.map((d, index) =>
        query(
          `INSERT INTO defects(act_id, seq_no, description, location, responsible, due_date)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [act.id, index + 1, d.description, d.location, d.responsible, d.due_date || due]
        )
      )
    );
  }

  await addAudit({ actorId: req.user.id, entityType: 'act', entityId: act.id, action: 'create', diff: data });
  return res.status(201).json(act);
}

export async function getAct(req, res) {
  const { id } = req.params;
  const act = await query('SELECT * FROM acts WHERE id=$1', [id]);
  if (!act.rows[0]) return res.status(404).json({ message: 'Not found' });
  const defects = await query('SELECT * FROM defects WHERE act_id=$1 ORDER BY seq_no', [id]);
  return res.json({ ...act.rows[0], defects: defects.rows });
}

export async function updateAct(req, res) {
  const { id } = req.params;
  const data = req.body;
  const result = await query(
    `UPDATE acts SET
      title=$1, status=$2, object_name=$3, object_address=$4,
      representative_position=$5, representative_last_name=$6,
      commission_position=$7, commission_last_name=$8,
      contractor_id=$9, form_payload=$10, updated_by=$11
     WHERE id=$12 RETURNING *`,
    [
      data.title,
      data.status,
      data.object_name,
      data.object_address,
      data.representative_position,
      data.representative_last_name,
      data.commission_position,
      data.commission_last_name,
      data.contractor_id || null,
      data.form_payload || {},
      req.user.id,
      id
    ]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Not found' });
  await addAudit({ actorId: req.user.id, entityType: 'act', entityId: id, action: 'update', diff: data });
  res.json(result.rows[0]);
}

export async function deleteAct(req, res) {
  const { id } = req.params;
  await query('DELETE FROM acts WHERE id=$1', [id]);
  await addAudit({ actorId: req.user.id, entityType: 'act', entityId: id, action: 'delete' });
  res.status(204).send();
}

export async function exportActPdf(req, res) {
  const { id } = req.params;
  const act = (await query('SELECT * FROM acts WHERE id=$1', [id])).rows[0];
  if (!act) return res.status(404).json({ message: 'Not found' });
  const defects = (await query('SELECT * FROM defects WHERE act_id=$1 ORDER BY seq_no', [id])).rows;
  const buffer = await renderActPdf({ act, defects });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=act-${act.act_number}.pdf`);
  return res.send(buffer);
}

export async function exportActExcel(req, res) {
  const { id } = req.params;
  const act = (await query('SELECT * FROM acts WHERE id=$1', [id])).rows[0];
  if (!act) return res.status(404).json({ message: 'Not found' });
  const defects = (await query('SELECT * FROM defects WHERE act_id=$1 ORDER BY seq_no', [id])).rows;
  const buffer = await exportActToExcel(act, defects);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=act-${act.act_number}.xlsx`);
  return res.send(Buffer.from(buffer));
}
