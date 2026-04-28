import { aiEnabled, env } from '../config/env';
import { logger } from '../config/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

export const isAiEnabled = aiEnabled;

export function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

export async function callOpenRouter(
  messages: ChatMessage[],
  options: CallOptions = {},
): Promise<string> {
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

export async function* callOpenRouterStream(
  messages: ChatMessage[],
  options: CallOptions = {},
): AsyncGenerator<string> {
  const url = `${env.OPENROUTER_BASE_URL}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.CLIENT_ORIGIN,
        'X-Title': env.OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        model: options.model ?? env.OPENROUTER_MODEL,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 800,
      }),
    });
  } catch (err) {
    logger.error({ err }, 'OpenRouter stream connect failed');
    yield 'The AI assistant is temporarily unavailable. Please try again shortly.';
    return;
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    logger.error({ status: response.status, text: text.slice(0, 300) }, 'OpenRouter stream HTTP error');
    yield 'The AI assistant is temporarily unavailable. Please try again shortly.';
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIdx;
      while ((separatorIdx = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, separatorIdx);
        buffer = buffer.slice(separatorIdx + 2);

        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') return;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            
          }
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {  }
  }
}
