import { query } from '../config/db.js';
import { addAudit } from '../utils/audit.js';

export async function listContractors(req, res) {
  const q = req.query.q?.trim();
  const result = q
    ? await query(
        `SELECT * FROM contractors
         WHERE org_name ILIKE $1 OR contact ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
         ORDER BY created_at DESC`,
        [`%${q}%`]
      )
    : await query('SELECT * FROM contractors ORDER BY created_at DESC');
  return res.json(result.rows);
}

export async function createContractor(req, res) {
  const { org_name, contact, phone, email, address } = req.body;
  const result = await query(
    `INSERT INTO contractors(org_name, contact, phone, email, address)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [org_name, contact, phone, email, address]
  );
  await addAudit({ actorId: req.user.id, entityType: 'contractor', entityId: result.rows[0].id, action: 'create' });
  return res.status(201).json(result.rows[0]);
}

export async function updateContractor(req, res) {
  const { id } = req.params;
  const { org_name, contact, phone, email, address } = req.body;
  const result = await query(
    `UPDATE contractors
     SET org_name=$1, contact=$2, phone=$3, email=$4, address=$5
     WHERE id=$6 RETURNING *`,
    [org_name, contact, phone, email, address, id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Not found' });
  await addAudit({ actorId: req.user.id, entityType: 'contractor', entityId: id, action: 'update' });
  return res.json(result.rows[0]);
}

export async function deleteContractor(req, res) {
  const { id } = req.params;
  await query('DELETE FROM contractors WHERE id = $1', [id]);
  await addAudit({ actorId: req.user.id, entityType: 'contractor', entityId: id, action: 'delete' });
  return res.status(204).send();
}
