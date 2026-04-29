import { aiEnabled, env } from '../config/env';

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

