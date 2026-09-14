import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '@quizforge/shared';
import { db } from '../../db/client';

export class AuditService {
  public static async logAction(
    userId: string | undefined,
    userName: string | undefined,
    userEmail: string | undefined,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const id = uuidv4();
      await db.query(
        `INSERT INTO audit_logs (id, user_id, user_name, user_email, action, entity, entity_id, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          id,
          userId || null,
          userName || 'System',
          userEmail || 'system@quizforge.com',
          action,
          entity,
          entityId || null,
          JSON.stringify(metadata || {})
        ]
      );
    } catch (err: any) {
      console.warn('Failed to record audit log:', err.message);
    }
  }

  public static async getLogs(limit = 100): Promise<AuditLog[]> {
    const res = await db.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || 'System',
      userEmail: r.user_email || '',
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      metadata: typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json,
      createdAt: r.created_at
    }));
  }
}
