import 'server-only';
import { getSupabaseService } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';
import { estimateCostCents, type Vendor } from './cost';

const log = logger.child({ component: 'usage/record' });

export interface RecordUsageInput {
  userId?: string | null;
  sessionId?: string | null;
  peekId?: string | null;
  vendor: Vendor;
  kind: string;
  payload?: Record<string, unknown>;
  costCentsOverride?: number;
}

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const payload = input.payload ?? {};
  const costCents =
    input.costCentsOverride !== undefined
      ? input.costCentsOverride
      : estimateCostCents(input.vendor, input.kind, payload);

  try {
    const sb = getSupabaseService();
    const { error } = await sb.from('usage_ledger').insert({
      user_id: input.userId ?? null,
      session_id: input.sessionId ?? null,
      peek_id: input.peekId ?? null,
      vendor: input.vendor,
      kind: input.kind,
      cost_cents: costCents,
      payload,
    });
    if (error) {
      log.warn('insert_failed', {
        vendor: input.vendor,
        kind: input.kind,
        err: error.message,
      });
    }
  } catch (err) {
    log.warn('insert_threw', {
      vendor: input.vendor,
      kind: input.kind,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export function recordUsageFireAndForget(input: RecordUsageInput): void {
  void recordUsage(input).catch((err) => {
    log.warn('fire_and_forget_failed', {
      vendor: input.vendor,
      kind: input.kind,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}
