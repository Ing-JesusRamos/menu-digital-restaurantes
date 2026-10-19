import { auditEvents } from "@/lib/db/schema";

export type AuditEventInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  restaurantId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  confirmationMethod?: string;
  requestId?: string;
  metadata?: unknown;
};

export async function recordAuditEvent(db: any, event: AuditEventInput) {
  await db.insert(auditEvents).values({
    actorUserId: event.actorUserId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    restaurantId: event.restaurantId,
    before: event.before,
    after: event.after,
    reason: event.reason,
    confirmationMethod: event.confirmationMethod,
    requestId: event.requestId,
    metadata: event.metadata,
  });
}
