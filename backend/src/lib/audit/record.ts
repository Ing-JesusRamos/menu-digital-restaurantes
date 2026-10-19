import { getDatabase } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";

export async function recordAudit(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  restaurantId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  requestId?: string;
  metadata?: unknown;
}) {
  await getDatabase().insert(auditEvents).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    restaurantId: input.restaurantId,
    before: input.before,
    after: input.after,
    reason: input.reason,
    requestId: input.requestId,
    metadata: input.metadata,
  });
}
