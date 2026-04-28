import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { AI_LIMITS, AI_PROMPTS } from '../utils/ai-prompts';
import {
  callOpenRouter,
  callOpenRouterStream,
  ChatMessage,
  clip,
  isAiEnabled,
} from '../utils/openrouter';

/**
 * Build the messages array we send to OpenRouter for a chat session.
 * Caps total payload size so a long conversation can't run away with cost.
 */
function buildChatPayload(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
): ChatMessage[] {
  let totalChars = 0;
  const out: ChatMessage[] = [{ role: 'system', content: AI_PROMPTS.chatSystem }];
  for (const m of messages) {
    const role: ChatMessage['role'] = m.role === 'model' ? 'assistant' : 'user';
    const content = clip(m.content, AI_LIMITS.chatTotalMaxChars - totalChars);
    if (!content) break;
    totalChars += content.length;
    out.push({ role, content });
    if (totalChars >= AI_LIMITS.chatTotalMaxChars) break;
  }
  return out;
}

/**
 * POST /api/ai/summarize — generate a 120-word summary of an article.
 * Caching disabled: every call hits OpenRouter fresh and the result is
 * NOT persisted onto the article (the `Article.summary` field is left
 * untouched).
 */
export async function summarize(req: Request, res: Response): Promise<void> {
  const { articleId } = req.body as { articleId: string; refresh?: boolean };

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw ApiError.notFound('Article not found');

  const trimmedContent = clip(article.content, AI_LIMITS.contentMaxChars);

  let summary: string;
  if (!isAiEnabled) {
    // Stub fallback: take the first 4 sentences as bullet points.
    const sentences = trimmedContent
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 4)
      .map((s) => `• ${s.trim()}`)
      .join('\n');
    summary = sentences || 'Summary unavailable.';
  } else {
    try {
      summary = await callOpenRouter(
        [
          { role: 'system', content: 'You write clear, concise study summaries.' },
          { role: 'user', content: AI_PROMPTS.summarize(trimmedContent, 120) },
        ],
        { temperature: 0.4, maxTokens: 400 },
      );
      if (!summary) summary = 'Summary unavailable.';
    } catch (err) {
      logger.error({ err }, 'AI summarize failed');
      summary = 'Summary is currently unavailable. Please try again shortly.';
    }
  }

  res.json({ ok: true, data: { summary, cached: false } });
}

/** POST /api/ai/hint — Socratic nudge for a short-answer question. */
export async function hint(req: Request, res: Response): Promise<void> {
  const { articleId, questionId, draft } = req.body as {
    articleId: string;
    questionId: string;
    draft?: string;
  };

  const assignment = await prisma.assignment.findUnique({ where: { articleId } });
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const question = assignment.questions.find((q) => q.id === questionId);
  if (!question) throw ApiError.notFound('Question not found');

  // Pick whichever internal answer reference we have (model answer for SHORT,
  // correct option for MCQ). NEVER returned to the user; only used to steer
  // the AI's hint.
  const internalRef =
    question.modelAnswer ??
    (question.correctIndex != null ? question.options[question.correctIndex] : undefined);

  if (!isAiEnabled) {
    res.json({
      ok: true,
      data: {
        hint:
          'Re-read the relevant section of the article and focus on the keyword(s) in the question. Try rephrasing your answer in your own words.',
      },
    });
    return;
  }

  let text: string;
  try {
    text = await callOpenRouter(
      [
        { role: 'system', content: 'You are a Socratic tutor who never reveals the answer.' },
        {
          role: 'user',
          content: AI_PROMPTS.hint({
            question: clip(question.prompt, AI_LIMITS.contentMaxChars),
            rubricOrCorrect: internalRef ? clip(internalRef, AI_LIMITS.contentMaxChars) : undefined,
            userDraft: draft ? clip(draft, AI_LIMITS.hintDraftMaxChars) : undefined,
          }),
        },
      ],
      { temperature: 0.7, maxTokens: 200 },
    );
    if (!text) text = 'Try breaking the question into smaller parts.';
  } catch (err) {
    logger.error({ err }, 'AI hint failed');
    text = 'Hint unavailable right now. Try outlining the key concept in your own words.';
  }

  res.json({ ok: true, data: { hint: text } });
}

/** POST /api/ai/chat — non-streaming chat reply (kept for backwards compat). */
export async function chat(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
  };

  if (!isAiEnabled) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    res.json({
      ok: true,
      data: { reply: `(AI is offline in this environment.) Stub reply to: "${lastUser.slice(0, 80)}…"` },
    });
    return;
  }

  let reply: string;
  try {
    reply = await callOpenRouter(buildChatPayload(messages), { temperature: 0.7, maxTokens: 800 });
    if (!reply) reply = 'I was unable to generate a response.';
  } catch (err) {
    logger.error({ err }, 'AI chat failed');
    reply = 'The AI assistant is temporarily unavailable. Please try again shortly.';
  }
  res.json({ ok: true, data: { reply } });
}

/**
 * POST /api/ai/chat/stream — Server-Sent Events stream of chat tokens.
 * Each event is `data: {"delta": "<token>"}\n\n`, then `data: [DONE]\n\n`.
 */
export async function chatStream(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
  };

  // Open the stream — set SSE headers and flush them so the browser knows
  // we're going to push events as they arrive.
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering on Render/nginx
  res.flushHeaders();
  res.write(': stream open\n\n');

  // Stop sending if the user navigated away.
  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  // Stub branch: yield one fake delta and end.
  if (!isAiEnabled) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    res.write(
      `data: ${JSON.stringify({
        delta: `(AI is offline in this environment.) Stub reply to: "${lastUser.slice(0, 80)}…"`,
      })}\n\n`,
    );
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    for await (const delta of callOpenRouterStream(buildChatPayload(messages), {
      temperature: 0.7,
      maxTokens: 800,
    })) {
      if (aborted) break;
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    if (!aborted) res.write('data: [DONE]\n\n');
  } catch (err) {
    logger.error({ err }, 'chatStream failed');
    if (!aborted) {
      res.write(`data: ${JSON.stringify({ error: 'stream failed' })}\n\n`);
    }
  } finally {
    res.end();
  }
}
