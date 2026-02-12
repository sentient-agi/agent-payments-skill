// Audit Trail
//
import { getDb } from "./sqlite";
import { getLogger } from "../logging/logger";

export function auditLog(
  level: "info" | "warn" | "error" | "critical",
  category: string,
  action: string,
  details?: Record<string, unknown>,
  extra?: { tx_id?: string; actor?: string; ip_address?: string; user_agent?: string }
): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (level, category, action, tx_id, actor, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      level,
      category,
      action,
      extra?.tx_id ?? null,
      extra?.actor ?? "system",
      details ? JSON.stringify(details) : null,
      extra?.ip_address ?? null,
      extra?.user_agent ?? null
    );
  } catch {
    // Audit logging must not throw and crash the payment flow
  }

  // Also log to Winston for file/stdout output
  try {
    const logger = getLogger();
    logger.log(level === "critical" ? "error" : level, `[AUDIT] ${category}/${action}`, {
      ...details,
      tx_id: extra?.tx_id,
      actor: extra?.actor,
    });
  } catch {
    // swallow
  }
}

export function queryAuditLog(filters: {
  category?: string;
  tx_id?: string;
  since?: string;
  limit?: number;
}): Array<Record<string, unknown>> {
  const db = getDb();
  let sql = "SELECT * FROM audit_log WHERE 1=1";
  const params: unknown[] = [];

  if (filters.category) {
    sql += " AND category = ?";
    params.push(filters.category);
  }
  if (filters.tx_id) {
    sql += " AND tx_id = ?";
    params.push(filters.tx_id);
  }
  if (filters.since) {
    sql += " AND timestamp >= ?";
    params.push(filters.since);
  }

  sql += " ORDER BY timestamp DESC LIMIT ?";
  params.push(filters.limit ?? 100);

  return db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
}
