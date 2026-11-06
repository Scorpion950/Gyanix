import { supabaseAdmin } from '../config/supabase.js';

export interface AuditLogOptions {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}

/**
 * Writes a structured entry to the audit_logs table.
 * Never log sensitive data: passwords, tokens, full emails, PII.
 * This function never throws — it logs errors internally.
 */
export async function writeAuditLog(options: AuditLogOptions): Promise<void> {
  const { actorId, action, targetType, targetId, metadata, ipHash } = options;

  const { error } = await supabaseAdmin.from('audit_logs').insert({
    actor_id: actorId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata: metadata ?? {},
    ip_hash: ipHash ?? null,
  });

  if (error) {
    console.error(`[audit] Failed to write log: ${error.message}`);
  }
}

/**
 * Hashes an IP address with a one-way function so it can be used
 * for rate limiting and abuse detection without storing raw IPs.
 */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (process.env['IP_HASH_SALT'] ?? 'gyanix-salt'));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex').slice(0, 32);
}
