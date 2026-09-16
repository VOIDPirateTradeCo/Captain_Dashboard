/**
 * Model catalog — the single source of truth for dispatchable models.
 *
 * - `name` is `<provider>/<modelId>`, where `<modelId>` is the exact model ID
 *   the provider's API accepts (what dispatch code sends on the wire).
 * - `costPerMTok` is USD per MILLION tokens. The field was previously named
 *   `costPer1k`, but the values were always per-MTok prices — the old name
 *   was a 1000x units footgun. Prices verified against provider docs
 *   2026-07-04 (see per-provider source comments below).
 */
export interface ModelCostPerMTok {
  /** USD per 1M input tokens */
  input: number
  /** USD per 1M output tokens */
  output: number
  /** USD per 1M cached input tokens read */
  cacheRead?: number
  /** USD per 1M cached input tokens written, when supported */
  cacheWrite?: number | null
}

export type ModelInputModality = 'text' | 'image' | 'video'
export type ModelThinkingMode = 'adaptive' | 'disabled' | 'always_on'

export interface ModelConfig {
  alias: string
  name: string
  provider: string
  description: string
  costPerMTok: ModelCostPerMTok
  contextWindow?: number
  inputModalities?: ModelInputModality[]
  thinking?: ModelThinkingMode[]
}

export const MODEL_CATALOG: ModelConfig[] = [
  // Anthropic — https://platform.claude.com/docs/en/about-claude/pricing (verified 2026-07-04)
  { alias: 'haiku', name: 'anthropic/claude-haiku-4-5', provider: 'anthropic', description: 'Ultra-cheap, simple tasks', costPerMTok: { input: 1.0, output: 5.0 } },
  { alias: 'sonnet', name: 'anthropic/claude-sonnet-4-6', provider: 'anthropic', description: 'Standard workhorse', costPerMTok: { input: 3.0, output: 15.0 } },
  { alias: 'opus', name: 'anthropic/claude-opus-4-6', provider: 'anthropic', description: 'Premium quality', costPerMTok: { input: 5.0, output: 25.0 } },
  // OpenAI — https://developers.openai.com/api/docs/models/gpt-4.1 (and sibling model pages, verified 2026-07-04)
  { alias: 'gpt-4.1', name: 'openai/gpt-4.1', provider: 'openai', description: 'GPT-4.1 flagship', costPerMTok: { input: 2.0, output: 8.0 } },
  { alias: 'gpt-4.1-mini', name: 'openai/gpt-4.1-mini', provider: 'openai', description: 'GPT-4.1 Mini, fast + cheap', costPerMTok: { input: 0.4, output: 1.6 } },
  { alias: 'gpt-4.1-nano', name: 'openai/gpt-4.1-nano', provider: 'openai', description: 'GPT-4.1 Nano, ultra-fast', costPerMTok: { input: 0.1, output: 0.4 } },
  // Marked deprecated by OpenAI (still served) — https://developers.openai.com/api/docs/models/codex-mini-latest
  { alias: 'codex-mini', name: 'openai/codex-mini-latest', provider: 'openai', description: 'Codex Mini, optimized for code', costPerMTok: { input: 1.5, output: 6.0 } },
  // Google — https://ai.google.dev/gemini-api/docs/pricing (verified 2026-07-04; Pro rates are the <=200K-token-prompt tier)
  { alias: 'gemini-2.5-pro', name: 'google/gemini-2.5-pro', provider: 'google', description: 'Gemini 2.5 Pro', costPerMTok: { input: 1.25, output: 10.0 } },
  { alias: 'gemini-2.5-flash', name: 'google/gemini-2.5-flash', provider: 'google', description: 'Gemini 2.5 Flash, fast', costPerMTok: { input: 0.3, output: 2.5 } },
  // Google Gemini FREE tier (AI Studio) — flash models are free
  { alias: 'gemini-flash-free', name: 'google/gemini-2.5-flash', provider: 'google-free', description: 'Gemini 2.5 Flash (free tier)', costPerMTok: { input: 0.0, output: 0.0 } },
  // Local / open-source
  { alias: 'deepseek', name: 'ollama/deepseek-r1:14b', provider: 'ollama', description: 'Local reasoning (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  // Groq (hosted inference) — https://groq.com/pricing (verified 2026-07-04)
  { alias: 'groq-fast', name: 'groq/llama-3.1-8b-instant', provider: 'groq', description: '840 tok/s, ultra fast', costPerMTok: { input: 0.05, output: 0.08 } },
  { alias: 'groq', name: 'groq/llama-3.3-70b-versatile', provider: 'groq', description: 'Fast + quality balance', costPerMTok: { input: 0.59, output: 0.79 } },
  // Groq FREE tier (gpt-oss, Qwen)
  { alias: 'groq-gpt-oss-120b', name: 'groq/openai/gpt-oss-120b', provider: 'groq-free', description: 'GPT-OSS 120B (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'groq-qwen', name: 'groq/qwen3-32b', provider: 'groq-free', description: 'Qwen3 32B (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  // OpenRouter — 20+ free models, single API key
  { alias: 'or-llama-3.3-70b-free', name: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', provider: 'openrouter-free', description: 'Llama 3.3 70B (free via OpenRouter)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'or-glm-4.7-flash-free', name: 'openrouter/glm-4.7-flash:free', provider: 'openrouter-free', description: 'GLM 4.7 Flash (free via OpenRouter)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'or-mistral-7b-free', name: 'openrouter/mistral-7b-instruct:free', provider: 'openrouter-free', description: 'Mistral 7B (free via OpenRouter)', costPerMTok: { input: 0.0, output: 0.0 } },
  // Cloudflare Workers AI — 10K neurons/day free
  { alias: 'cf-llama-3.3-70b', name: 'cloudflare/@cf/meta/llama-3.3-70b-instruct', provider: 'cloudflare-free', description: 'Llama 3.3 70B (free neurons)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'cf-gpt-oss-120b', name: 'cloudflare/@cf/openai/gpt-oss-120b', provider: 'cloudflare-free', description: 'GPT-OSS 120B (free neurons)', costPerMTok: { input: 0.0, output: 0.0 } },
  // NVIDIA NIM — 120+ models, 40 RPM free
  { alias: 'nvidia-nemotron', name: 'nvidia/nemotron-3-ultra', provider: 'nvidia-free', description: 'Nemotron 3 Ultra (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'nvidia-deepseek', name: 'nvidia/deepseek-v4-pro', provider: 'nvidia-free', description: 'DeepSeek V4 Pro (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'nvidia-llama', name: 'nvidia/llama-3.3-70b-instruct', provider: 'nvidia-free', description: 'Llama 3.3 70B (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  // GitHub Models — 150-1K/day free
  { alias: 'gh-gpt-4o', name: 'github/gpt-4o', provider: 'github-free', description: 'GPT-4o (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'gh-claude-sonnet', name: 'github/claude-sonnet-4', provider: 'github-free', description: 'Claude Sonnet (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'gh-llama-3.3-70b', name: 'github/llama-3.3-70b-instruct', provider: 'github-free', description: 'Llama 3.3 70B (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  // Z.ai (GLM) — free flash models
  { alias: 'glm-4.7-flash', name: 'zai/glm-4.7-flash', provider: 'zai-free', description: 'GLM 4.7 Flash (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'glm-4.5-flash', name: 'zai/glm-4.5-flash', provider: 'zai-free', description: 'GLM 4.5 Flash (free)', costPerMTok: { input: 0.0, output: 0.0 } },
  // Mistral — $10/month free credits
  { alias: 'mistral-large', name: 'mistral/mistral-large-latest', provider: 'mistral-free', description: 'Mistral Large (free credits)', costPerMTok: { input: 0.0, output: 0.0 } },
  { alias: 'mistral-7b', name: 'mistral/mistral-7b-instruct', provider: 'mistral-free', description: 'Mistral 7B (free credits)', costPerMTok: { input: 0.0, output: 0.0 } },
  // MiniMax — https://platform.minimax.io/docs/guides/pricing-paygo (verified 2026-07-24)
  {
    alias: 'minimax',
    name: 'minimax/MiniMax-M3',
    provider: 'minimax',
    description: 'Multimodal model with configurable thinking',
    costPerMTok: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: null },
    contextWindow: 1_000_000,
    inputModalities: ['text', 'image', 'video'],
    thinking: ['adaptive', 'disabled'],
  },
  {
    alias: 'minimax-m2.7',
    name: 'minimax/MiniMax-M2.7',
    provider: 'minimax',
    description: 'Text model with always-on thinking',
    costPerMTok: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
    contextWindow: 204_800,
    inputModalities: ['text'],
    thinking: ['always_on'],
  },
  // Other providers — Moonshot list price via https://openrouter.ai/moonshotai/kimi-k2.5;
  // Venice https://docs.venice.ai/overview/pricing.
  { alias: 'kimi', name: 'moonshot/kimi-k2.5', provider: 'moonshot', description: 'Alternative provider', costPerMTok: { input: 0.6, output: 3.0 } },
  { alias: 'venice-llama-3.3-70b', name: 'venice/llama-3.3-70b', provider: 'venice', description: 'Venice AI Llama 3.3 70B', costPerMTok: { input: 0.7, output: 2.8 } },
]

export function getModelByAlias(alias: string): ModelConfig | undefined {
  return MODEL_CATALOG.find(m => m.alias === alias)
}

export function getModelByName(name: string): ModelConfig | undefined {
  return MODEL_CATALOG.find(m => m.name === name)
}

export function getAllModels(): ModelConfig[] {
  return [...MODEL_CATALOG]
}

/**
 * The exact model ID sent to the provider's API — the catalog `name` with the
 * `<provider>/` prefix stripped (e.g. 'anthropic/claude-opus-4-6' → 'claude-opus-4-6').
 */
export function getDispatchModelId(model: ModelConfig): string {
  const idx = model.name.indexOf('/')
  return idx === -1 ? model.name : model.name.slice(idx + 1)
}

/**
 * Classify a model string to its provider using the catalog as the single
 * source of truth. Accepts the catalog `name` ('<provider>/<modelId>'), the
 * bare dispatch model ID, or the catalog alias.
 *
 * Returns undefined for models not in the catalog — callers are expected to
 * apply their own fallback (e.g. the prefix-match rules in
 * `pickProvider()` in task-dispatch.ts), so unknown-model behavior is
 * preserved exactly.
 */
export function classifyModelProvider(model: string): string | undefined {
  const normalized = model.trim().toLowerCase()
  if (!normalized) return undefined
  const entry = MODEL_CATALOG.find(m =>
    m.name.toLowerCase() === normalized
    || getDispatchModelId(m).toLowerCase() === normalized
    || m.alias.toLowerCase() === normalized
  )
  return entry?.provider
}
