export type Vendor =
  | 'anthropic'
  | 'browserbase'
  | 'zenrows'
  | 'jina'
  | 'fal'
  | 'resend'
  | 'twilio';

export interface AnthropicCostPayload {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface AnthropicRate {
  input: number;
  output: number;
}

const ANTHROPIC_RATES: Record<string, AnthropicRate> = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'claude-opus-4-7': { input: 15, output: 75 },
};

const ANTHROPIC_FALLBACK: AnthropicRate = { input: 3, output: 15 };

function anthropicRate(model: string): AnthropicRate {
  for (const key of Object.keys(ANTHROPIC_RATES)) {
    if (model.startsWith(key)) {
      return ANTHROPIC_RATES[key] ?? ANTHROPIC_FALLBACK;
    }
  }
  return ANTHROPIC_FALLBACK;
}

function isAnthropicPayload(value: unknown): value is AnthropicCostPayload {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function estimateCostCents(
  vendor: Vendor,
  kind: string,
  payload: unknown,
): number {
  if (vendor === 'anthropic') {
    if (!isAnthropicPayload(payload)) return 0;
    const rate = anthropicRate(kind);
    const input = num(payload.input_tokens);
    const output = num(payload.output_tokens);
    const cacheRead = num(payload.cache_read_input_tokens);
    const cacheCreate = num(payload.cache_creation_input_tokens);
    const dollars =
      (input * rate.input) / 1_000_000 +
      (output * rate.output) / 1_000_000 +
      (cacheRead * rate.input * 0.1) / 1_000_000 +
      (cacheCreate * rate.input * 1.25) / 1_000_000;
    return Math.round(dollars * 100);
  }

  if (vendor === 'browserbase') {
    return Math.round(0.0167 * 100);
  }

  if (vendor === 'zenrows') {
    return Math.round(0.001 * 100);
  }

  if (vendor === 'jina') {
    return 0;
  }

  if (vendor === 'fal') {
    if (kind.includes('flux/pro') || kind.includes('flux-pro')) {
      return Math.round(0.05 * 100);
    }
    return Math.round(0.003 * 100);
  }

  if (vendor === 'resend') {
    return 0;
  }

  if (vendor === 'twilio') {
    return Math.round(0.0075 * 100);
  }

  return 0;
}
