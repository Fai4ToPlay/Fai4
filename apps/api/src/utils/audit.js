import { query } from '../config/db.js';

export async function addAudit({ actorId, entityType, entityId, action, diff }) {
  await query(
    `INSERT INTO audit_logs(actor_id, entity_type, entity_id, action, diff)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId || null, entityType, entityId || null, action, diff || null]
  );
}
