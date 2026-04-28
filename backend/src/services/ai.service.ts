import { aiEnabled, env } from '../config/env';
import { logger } from '../config/logger';
import { AI_LIMITS, AI_PROMPTS } from '../utils/ai-prompts';

/**
 * AI integration via OpenRouter (https://openrouter.ai). OpenRouter exposes an
 * OpenAI-compatible chat-completions endpoint that proxies to any model in its
 * catalogue (`openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku`,
 * `meta-llama/llama-3.1-70b-instruct`, etc.). The model is configurable via
 * `OPENROUTER_MODEL`.
 *
 * When `OPENROUTER_API_KEY` is missing, every function falls back to a
 * deterministic stub so dev environments work without an API key.
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

async function callOpenRouter(messages: ChatMessage[], options: CallOptions = {}): Promise<string> {
  const url = `${env.OPENROUTER_BASE_URL}/chat/completions`;
  const body: Record<string, unknown> = {
    model: options.model ?? env.OPENROUTER_MODEL,
    messages,
  };
  if (options.temperature != null) body.temperature = options.temperature;
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  if (options.jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // OpenRouter analytics headers (optional but recommended).
      'HTTP-Referer': env.CLIENT_ORIGIN,
      'X-Title': env.OPENROUTER_APP_NAME,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${text.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

export interface EvaluationResult {
  score: number;
  feedback: string;
}

/**
 * Grades a short-answer response. Returns a deterministic fallback when AI is
 * not configured so dev environments work without an OpenRouter key.
 */
export async function evaluateAnswer(input: {
  question: string;
  modelAnswer: string;
  rubric?: string;
  userAnswer: string;
}): Promise<EvaluationResult> {
  if (!aiEnabled) return mockEvaluate(input);

  const prompt = AI_PROMPTS.evaluate({
    question: truncate(input.question, AI_LIMITS.contentMaxChars),
    modelAnswer: truncate(input.modelAnswer, AI_LIMITS.contentMaxChars),
    rubric: input.rubric ? truncate(input.rubric, AI_LIMITS.contentMaxChars) : undefined,
    userAnswer: truncate(input.userAnswer, AI_LIMITS.answerMaxChars),
  });

  try {
    const text = await callOpenRouter(
      [
        {
          role: 'system',
          content:
            'You are a strict grading assistant. Return ONLY a JSON object matching the requested shape. Do not include prose, markdown, or code fences.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, jsonMode: true, maxTokens: 400 },
    );

    const parsed = parseJsonLoose(text) as { score?: unknown; feedback?: unknown } | null;
    if (!parsed) throw new Error('AI response was not valid JSON');

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback ?? '').slice(0, 800) || 'No feedback returned.';
    return { score, feedback };
  } catch (err) {
    logger.error({ err }, 'AI evaluateAnswer failed');
    return {
      score: 0,
      feedback: 'Auto-evaluation is currently unavailable; this submission is pending review.',
    };
  }
}

function mockEvaluate(input: {
  question: string;
  modelAnswer: string;
  userAnswer: string;
}): EvaluationResult {
  const a = input.userAnswer.toLowerCase();
  const m = input.modelAnswer.toLowerCase();
  const tokens = m.split(/\W+/).filter((t) => t.length > 4).slice(0, 12);
  const matches = tokens.filter((t) => a.includes(t)).length;
  const ratio = tokens.length ? matches / tokens.length : 0;
  const score = Math.round(40 + ratio * 60);
  return {
    score: Math.min(100, Math.max(0, score)),
    feedback:
      score >= 75
        ? 'Good answer — covers most of the key points. Minor details could be clarified.'
        : score >= 50
          ? 'Partial answer. Re-read the article and add more concrete details / examples.'
          : 'Answer is incomplete. Revisit the relevant section before retrying.',
  };
}

export async function summarizeArticle(content: string, opts?: { maxWords?: number }): Promise<string> {
  const trimmed = truncate(content, AI_LIMITS.contentMaxChars);
  if (!aiEnabled) {
    const sentences = trimmed
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 4)
      .map((s) => `• ${s.trim()}`)
      .join('\n');
    return sentences || 'Summary unavailable.';
  }

  try {
    const text = await callOpenRouter(
      [
        { role: 'system', content: 'You write clear, concise study summaries.' },
        { role: 'user', content: AI_PROMPTS.summarize(trimmed, opts?.maxWords ?? 120) },
      ],
      { temperature: 0.4, maxTokens: 400 },
    );
    return text || 'Summary unavailable.';
  } catch (err) {
    logger.error({ err }, 'AI summarizeArticle failed');
    return 'Summary is currently unavailable. Please try again shortly.';
  }
}

export async function generateHint(input: {
  question: string;
  rubricOrCorrect?: string;
  userDraft?: string;
}): Promise<string> {
  if (!aiEnabled) {
    return 'Re-read the relevant section of the article and focus on the keyword(s) in the question. Try rephrasing your answer in your own words.';
  }

  try {
    const text = await callOpenRouter(
      [
        { role: 'system', content: 'You are a Socratic tutor who never reveals the answer.' },
        {
          role: 'user',
          content: AI_PROMPTS.hint({
            question: truncate(input.question, AI_LIMITS.contentMaxChars),
            rubricOrCorrect: input.rubricOrCorrect ? truncate(input.rubricOrCorrect, AI_LIMITS.contentMaxChars) : undefined,
            userDraft: input.userDraft ? truncate(input.userDraft, AI_LIMITS.hintDraftMaxChars) : undefined,
          }),
        },
      ],
      { temperature: 0.7, maxTokens: 200 },
    );
    return text || 'Try breaking the question into smaller parts.';
  } catch (err) {
    logger.error({ err }, 'AI generateHint failed');
    return 'Hint unavailable right now. Try outlining the key concept in your own words.';
  }
}

/**
 * The frontend uses `{role: 'user' | 'model'}` to mirror Gemini's vocabulary.
 * Internally we translate `model` → `assistant` for OpenRouter.
 */
export async function chat(messages: Array<{ role: 'user' | 'model'; content: string }>): Promise<string> {
  if (!aiEnabled) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return `(AI is offline in this environment.) Stub response to: "${lastUser.slice(0, 80)}…"`;
  }

  // Cap total payload size to avoid runaway prompt costs.
  let totalChars = 0;
  const trimmed: ChatMessage[] = [{ role: 'system', content: AI_PROMPTS.chatSystem }];
  for (const m of messages) {
    const role: ChatMessage['role'] = m.role === 'model' ? 'assistant' : 'user';
    const content = truncate(m.content, AI_LIMITS.chatTotalMaxChars - totalChars);
    if (!content) break;
    totalChars += content.length;
    trimmed.push({ role, content });
    if (totalChars >= AI_LIMITS.chatTotalMaxChars) break;
  }

  try {
    const text = await callOpenRouter(trimmed, { temperature: 0.7, maxTokens: 800 });
    return text || 'I was unable to generate a response.';
  } catch (err) {
    logger.error({ err }, 'AI chat failed');
    return 'The AI assistant is temporarily unavailable. Please try again shortly.';
  }
}

/**
 * Some models wrap JSON output in ```json fences or add a leading apology. This
 * lifts the first balanced JSON object out of the response defensively.
 */
function parseJsonLoose(text: string): unknown {
  if (!text) return null;
  const direct = tryParse(text);
  if (direct !== undefined) return direct;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = tryParse(fenced[1]);
    if (inner !== undefined) return inner;
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    const parsed = tryParse(candidate);
    if (parsed !== undefined) return parsed;
  }
  return null;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
